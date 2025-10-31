import { config } from "../../../package.json";
import { MD5 } from "crypto-js"
import { Document } from "langchain/document";
import { similaritySearch } from "./OpenAI";
import Meet from "./api";
import ZoteroToolkit from "zotero-plugin-toolkit";

/**
 * Read clipboard
 * @returns string
 */
export function getClipboardText(): string {
  // @ts-ignore
  const clipboardService = window.Cc['@mozilla.org/widget/clipboard;1'].getService(Ci.nsIClipboard);
  // @ts-ignore
  const transferable = window.Cc['@mozilla.org/widget/transferable;1'].createInstance(Ci.nsITransferable);
  if (!transferable) {
    window.alert('Clipboard service error: Unable to create transferable instance');
  }
  transferable.addDataFlavor('text/unicode');
  clipboardService.getData(transferable, clipboardService.kGlobalClipboard);
  let clipboardData = {};
  let clipboardLength = {};
  try {
    transferable.getTransferData('text/unicode', clipboardData, clipboardLength);
  } catch (err: any) {
    window.console.error('Clipboard service acquisition failed:', err.message);
  }
  // @ts-ignore
  clipboardData = clipboardData.value.QueryInterface(Ci.nsISupportsString);
  // @ts-ignore
  return clipboardData.data
}

/**
 * Process selected items into full text
 * Note: Currently vectors obtained here are not stored because items are constantly being updated
 * @param key 
 * @returns 
 */
async function selectedItems2documents(key: string) {
  const docs = ZoteroPane.getSelectedItems().map((item: Zotero.Item) => {
    const text = JSON.stringify(item.toJSON());
    return new Document({
      pageContent: text.slice(0, 500),
      metadata: {
        type: "id",
        id: item.id,
        key
      }
    })
  })
  return docs
}

/**
 * https://github.com/MuiseDestiny/zotero-reference/blob/743bef7ac59d644675d8ab33a0b6c138d47fdb2f/src/modules/pdf.ts#L75
 * @param items 
 * @returns 
 */
function mergeSameLine(items: PDFItem[]) {
  let toLine = (item: PDFItem) => {
    let line: PDFLine = {
      x: parseFloat(item.transform[4].toFixed(1)),
      y: parseFloat(item.transform[5].toFixed(1)),
      text: item.str || "",
      height: item.height,
      width: item.width,
      url: item?.url,
      _height: [item.height]
    }
    if (line.width < 0) {
      line.x += line.width
      line.width = -line.width
    }
    return line
  }

  let j = 0
  let lines: PDFLine[] = [toLine(items[j])]
  for (j = 1; j < items.length; j++) {
    let line = toLine(items[j])
    let lastLine = lines.slice(-1)[0]
    // Consider superscript and subscript
    if (
      line.y == lastLine.y ||
      (line.y >= lastLine.y && line.y < lastLine.y + lastLine.height) ||
      (line.y + line.height > lastLine.y && line.y + line.height <= lastLine.y + lastLine.height)
    ) {
      lastLine.text += (" " + line.text)
      lastLine.width += line.width
      lastLine.url = lastLine.url || line.url
      // Record all heights
      lastLine._height.push(line.height)
    } else {
      // Process completed lines, assign height using mode
      let hh = lastLine._height
      // lastLine.height = hh.sort((a, b) => a - b)[parseInt(String(hh.length / 2))]
      // Use maximum value
      // lastLine.height = hh.sort((a, b) => b-a)[0]
      // Mode
      const num: any = {}
      for (let i = 0; i < hh.length; i++) {
        num[String(hh[i])] ??= 0
        num[String(hh[i])] += 1
      }
      lastLine.height = Number(
        Object.keys(num).sort((h1: string, h2: string) => {
          return num[h2] - num[h1]
        })[0]
      )
      // New line
      lines.push(line)
    }
  }
  return lines
}

declare type Box = {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Determine if two rectangles A and B intersect geometrically
 * @param A 
 * @param B 
 * @returns 
 */
function isIntersect(A: Box, B: Box): boolean {
  if (
    B.right < A.left ||
    B.left > A.right ||
    B.bottom > A.top ||
    B.top < A.bottom
  ) {
    return false
  } else {
    return true
  }
}

/**
 * Determine if two lines are at the same position across pages
 * @param lineA 
 * @param lineB 
 * @param maxWidth 
 * @param maxHeight 
 * @returns 
 */
function isIntersectLines(lineA: any, lineB: any, maxWidth: number, maxHeight: number) {
  let rectA = {
    left: lineA.x / maxWidth,
    right: (lineA.x + lineA.width) / maxWidth,
    bottom: lineA.y / maxHeight,
    top: (lineA.y + lineA.height) / maxHeight
  }
  let rectB = {
    left: lineB.x / maxWidth,
    right: (lineB.x + lineB.width) / maxWidth,
    bottom: lineB.y / maxHeight,
    top: (lineB.y + lineB.height) / maxHeight
  }
  return isIntersect(rectA, rectB)
}

/**
 * Read PDF full text, not stored because reading speed is generally fast
 * Of course excluding theses, books, etc.
 * This function stops reading when it encounters the reference keyword, because references greatly affect the final similarity calculation
 */
async function pdf2documents(itemkey: string) {
  const reader = await ztoolkit.Reader.getReader() as _ZoteroTypes.ReaderInstance
  const PDFViewerApplication = (reader._iframeWindow as any).wrappedJSObject.PDFViewerApplication;
  await PDFViewerApplication.pdfLoadingTask.promise;
  await PDFViewerApplication.pdfViewer.pagesPromise;
  let pages = PDFViewerApplication.pdfViewer._pages;
  let totalPageNum = pages.length
  // const popupWin = new ztoolkit.ProgressWindow("[Pending] PDF", { closeTime: -1 })
  //   .createLine({ text: `[1/${totalPageNum}] Reading`, progress: 1, type: "success" })
  //   .show()
  const popupWin = Meet.Global.popupWin.createLine({ text: `[1/${totalPageNum}] Reading PDF`, progress: 1, type: "success" })
    .show()
  // Read all page lines
  const pageLines: any = {}
  let docs: Document[] = []
  for (let pageNum = 0; pageNum < totalPageNum; pageNum++) {
    let pdfPage = pages[pageNum].pdfPage
    let textContent = await pdfPage.getTextContent()
    let items: PDFItem[] = textContent.items.filter((item: PDFItem) => item.str.trim().length)
    let lines = mergeSameLine(items)
    let index = lines.findIndex(line => /(r?eferences?|acknowledgements)$/i.test(line.text.trim()))
    if (index != -1) {
      lines = lines.slice(0, index)
    }
    pageLines[pageNum] = lines
    popupWin.changeLine({ idx: popupWin.lines.length - 1, text: `[${pageNum + 1}/${totalPageNum}] Reading PDF`, progress: (pageNum + 1) / totalPageNum * 100})
    // Prevent accidental removal
    if (index != -1 && pageNum / totalPageNum >= .9) {
      break
    }
  }
  popupWin.changeLine({ idx: popupWin.lines.length - 1, text: "Reading PDF", progress: 100 })
  popupWin.changeLine({ progress: 100 });
  totalPageNum = Object.keys(pageLines).length
  for (let pageNum = 0; pageNum < totalPageNum; pageNum++) {
    let pdfPage = pages[pageNum].pdfPage
    const maxWidth = pdfPage._pageInfo.view[2];
    const maxHeight = pdfPage._pageInfo.view[3];
    let lines = [...pageLines[pageNum]]
    // Remove header and footer information
    let removeLines = new Set()
    let removeNumber = (text: string) => {
      // English page numbers
      if (/^[A-Z]{1,3}$/.test(text)) {
        text = ""
      }
      // Normal page numbers 1,2,3
      text = text.replace(/\x20+/g, "").replace(/\d+/g, "")
      return text
    }
    // Whether it's a repeat
    let isRepeat = (line: PDFLine, _line: PDFLine) => {
      let text = removeNumber(line.text)
      let _text = removeNumber(_line.text)
      return text == _text && isIntersectLines(line, _line, maxWidth, maxHeight)
    }
    // Invalid lines that exist at the beginning or end of data
    for (let i of Object.keys(pageLines)) {
      if (Number(i) == pageNum) { continue }
      // Two different pages, start comparison
      let _lines = pageLines[i]
      let directions = {
        forward: {
          factor: 1,
          done: false
        },
        backward: {
          factor: -1,
          done: false
        }
      }
      for (let offset = 0; offset < lines.length && offset < _lines.length; offset++) {
        ["forward", "backward"].forEach((direction: string) => {
          if (directions[direction as keyof typeof directions].done) { return }
          let factor = directions[direction as keyof typeof directions].factor
          let index = factor * offset + (factor > 0 ? 0 : -1)
          let line = lines.slice(index)[0]
          let _line = _lines.slice(index)[0]
          if (isRepeat(line, _line)) {
            // Considered to be the same
            line[direction] = true
            removeLines.add(line)
          } else {
            directions[direction as keyof typeof directions].done = true
          }
        })
      }
      // Internal
      // Set a 100% body text area to prevent accidental removal
      const content = { x: 0.2 * maxWidth, width: .6 * maxWidth, y: .2 * maxHeight, height: .6 * maxHeight }
      for (let j = 0; j < lines.length; j++) {
        let line = lines[j]
        if (isIntersectLines(content, line, maxWidth, maxHeight)) { continue }
        for (let k = 0; k < _lines.length; k++) {
          let _line = _lines[k]
          if (isRepeat(line, _line)) {
            line.repeat = line.repeat == undefined ? 1 : (line.repeat + 1)
            line.repateWith = _line
            removeLines.add(line)
          }
        }
      }
    }
    lines = lines.filter((e: any) => !(e.forward || e.backward || (e.repeat && e.repeat > 3)));
    // Paragraph clustering
    // Principle: font size from large to small, merge; from small to large, break
    let abs = (x: number) => x > 0 ? x : -x
    const paragraphs = [[lines[0]]]
    for (let i = 1; i < lines.length; i++) {
      let lastLine = paragraphs.slice(-1)[0].slice(-1)[0]
      let currentLine = lines[i]
      let nextLine = lines[i + 1]
      const isNewParagraph =
        // Reach a certain line number threshold
        paragraphs.slice(-1)[0].length >= 5 && 
        (
          // Current line has a very large font text
          currentLine._height.some((h2: number) => lastLine._height.every((h1: number) => h2 > h1)) ||
          // If it's an abstract, make it a separate paragraph
          /abstract/i.test(currentLine.text) ||
          // Gap with previous line is too large
          abs(lastLine.y - currentLine.y) > currentLine.height * 2 ||
          // First line indentation for paragraphing
          (currentLine.x > lastLine.x && nextLine && nextLine.x < currentLine.x)
        )
      // Start new paragraph
      if (isNewParagraph) {
        paragraphs.push([currentLine])
      }
      // Otherwise include in current paragraph
      else {
        paragraphs.slice(-1)[0].push(currentLine)
      }
    }
    ztoolkit.log(paragraphs)
    // Paragraph merging
    for (let i = 0; i < paragraphs.length; i++) {
      let box: { page: number, left: number; top: number; right: number; bottom: number }
      /**
       * All lines belong to one paragraph
       * Merge while calculating its boundary
       */
      let _pageText = ""
      let line, nextLine
      for (let j = 0; j < paragraphs[i].length; j++) {
        line = paragraphs[i][j]
        if (!line) { continue }
        nextLine = paragraphs[i]?.[j + 1]
        // Update boundary
        box ??= { page: pageNum, left: line.x, right: line.x + line.width, top: line.y + line.height, bottom: line.y }
        if (line.x < box.left) {
          box.left = line.x
        }
        if (line.x + line.width > box.right) {
          box.right = line.x + line.width
        }
        if (line.y < box.bottom) {
          line.y = box.bottom
        }
        if (line.y + line.height > box.top) {
          box.top = line.y + line.height
        }
        _pageText += line.text
        if (
          nextLine &&
          line.height > nextLine.height
        ) {
          _pageText = "\n"
        } else if (j < paragraphs[i].length - 1) {
          if (!line.text.endsWith("-")) {
            _pageText += " "
          }
        }
      }
      _pageText = _pageText.replace(/\x20+/g, " ").replace(/^\x20*\n+/g, "").replace(/\x20*\n+/g, "");
      if (_pageText.length > 0) {
        docs.push(
          new Document({
            pageContent: _pageText,
            metadata: { type: "box", box: box!, key: itemkey },
          })
        )
      }
    }
  }
  // popupWin.changeHeadline("[Done] PDF")
  // popupWin.startCloseTimer(1000)
  console.log("pdf2documents", docs)
  return docs
}

/**
 * If currently in main panel, generate text based on selected items, search for related - for searching items
 * If in PDF reading interface, read PDF original text, search and return corresponding paragraphs - for summary questions
 * @param queryText 
 * @returns 
 */
export async function getRelatedText(queryText: string) {
  // @ts-ignore
  const cache = (window._GPTGlobal ??= {cache: []}).cache
  let docs: Document[], key: string
  switch (Zotero_Tabs.selectedIndex) {
    case 0:
      // Only reuse when the same item is selected again and the item hasn't changed, otherwise it will keep rebuilding the index
      // TODO - Optimize
      key = MD5(ZoteroPane.getSelectedItems().map(i => i.key).join("")).toString()
      docs = cache[key] || await selectedItems2documents(key)
      break;
    default:
      let pdfItem = Zotero.Items.get(
        Zotero.Reader.getByTabID(Zotero_Tabs.selectedID)!.itemID as number
      )
      key = pdfItem.key
      docs = cache[key] || await pdf2documents(key)
      break
  }
  cache[key] = docs
  docs = await similaritySearch(queryText, docs, { key }) as Document[]
  ztoolkit.log("docs", docs)
  Zotero[config.addonInstance].views.insertAuxiliary(docs)
  return docs.map((doc: Document, index: number) => `[${index + 1}]${doc.pageContent}`).join("\n\n")
}

/**
 * Get a field of selected item
 * @param fieldName 
 * @returns 
 */
export function getItemField(fieldName: any) {
  return ZoteroPane.getSelectedItems()[0].getField(fieldName)
}

/**
 * Get PDF page text
 * @returns 
 */
export function getPDFSelection() {
  try {
    return ztoolkit.Reader.getSelectedText(
      Zotero.Reader.getByTabID(Zotero_Tabs.selectedID)
    );
  } catch {
    return ""
  }
}

export async function getPDFAnnotations(select: boolean = false) {
  let keys: string[]
  if (select) {
    // try {
      const reader = await ztoolkit.Reader.getReader() as _ZoteroTypes.ReaderInstance
      const nodes = reader._iframeWindow?.document.querySelectorAll("[id^=annotation-].selected") as any
      ztoolkit.log(nodes)
      keys = [...nodes].map(i => i.id.split("-")[1])
      ztoolkit.log(keys)
    // } catch {}
  }
  const pdfItem = Zotero.Items.get(
    Zotero.Reader.getByTabID(Zotero_Tabs.selectedID)!.itemID as number
  )
  const docs: Document[] = [] 
  pdfItem.getAnnotations().forEach((anno: any) => {
    if (select && keys.indexOf(anno.key) == -1) { return }
    const pos = JSON.parse(anno.annotationPosition)
    const rect = pos.rects[0]
    docs.push(
      new Document({
        pageContent: anno.annotationText,
        metadata: {
          type: "box",
          box: { page: pos.pageIndex, left: rect[0], right: rect[2], top: rect[3], bottom: rect[1] },
          key: pdfItem.key
        }
      })
    )
  })
  Zotero[config.addonInstance].views.insertAuxiliary(docs)
  return docs.map((doc: Document, index: number) => `[${index + 1}]${doc.pageContent}`).join("\n\n")
}
