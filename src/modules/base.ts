import { config } from "../../package.json";


const help = `
### Quick Commands

\`/help\` Show all commands.
\`/clear\` Clear history conversation.
\`/report\` Run this and copy the output content to give feedback to the developer.
\`/secretKey sk-xxx\` Set GPT secret key. Generate it in https://platform.openai.com/account/api-keys.
\`/api https://api.openai.com\` Set API. 
\`/model gpt-4/gpt-3.5-turbo\` Set GPT model. For example, \`/model gpt-3.5-turbo\`.
\`/temperature 1.0\` Set GPT temperature. Controls the randomness and diversity of generated text, specified within a range of 0 to 1.
\`/chatNumber 3\` Set the number of saved historical conversations.
\`/relatedNumber 5\` Set the number of most relevant text. For example, the number of paragraphs referenced while using askPDF.
\`/deltaTime 100\` Control GPT smoothness (ms).
\`/width 32%\` Control GPT UI width (pct).
\`/tagsMore expand/scroll\` Set mode to display more tags.
\`/key default\` Restore the variable values above to their default values (if have).

### About UI

You can hold down \`Ctrl\` and scroll the mouse wheel to zoom the entire UI.
And when your mouse is in the output box, the size of any content in the output box will be adjusted.

### About Tag

You can \`long click\` on the tag below to see its internal pseudo-code.
You can type \`#xxx\` and press \`Enter\` to create a tag. And save it with \`Ctrl + S\`, during which you can execute it with \`Ctrl + R\`.
You can \`right-long-click\` a tag to delete it.

### About Output Text

You can \`double click\` on this text to copy GPT's answer.
You can \`long press\` me without releasing, then move me to a suitable position before releasing.

### About Input Text

You can exit me by pressing \`Esc\` above my head and wake me up by pressing \`Shift + /\` or \`Shift + ?\` in the Zotero main window.
You can type the question in my header, then press \`Enter\` to ask me.
You can press \`Ctrl + Enter\` to execute last executed command tag again.
You can press \`Shift + Enter\` to enter long text editing mode and press \`Ctrl + R\` to execute long text.
`
// This is OpenAI ChatGPT's font
const fontFamily = `Söhne,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif,Helvetica Neue,Arial,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji`

function parseTag(text: string) {
  text = text.replace(/^\n/, "").replace(/\n$/, "")
  let tagString = text.match(/^#(.+)\n/) as any
  function randomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }
  let tag: Tag = {
    tag: config.addonName,
    color: randomColor(),
    position: 9,
    text: text,
    trigger: "",
  }
  if (tagString) {
    tagString = tagString[0]
    tag.tag = tagString.match(/^#([^\[\n]+)/)[1]
    // Parse color
    let color = tagString.match(/\[c(?:olor)?="?(#.+?)"?\]/)
    tag.color = color?.[1] || tag.color
    // Parse position
    let position = tagString.match(/\[pos(?:ition)?="?(\d+?)"?\]/)
    tag.position = Number(position?.[1] || tag.position)
    // Parse keyword
    let trigger = tagString.match(/\[tr(?:igger)?="?(.+)"?\]/)
    tag.trigger = trigger?.[1] || tag.trigger
    tag.text = `#${tag.tag}[position=${tag.position}][color=${tag.color}][trigger=${tag.trigger}]` + "\n" + text.replace(/^#.+\n/, "")
  }
  return tag
}

/**
 * Default tags here cannot be deleted, but you can change the content, such as color position, internal prompt
 */
let defaultTags: any = [
`
#🪐AskPDF[color=#0EA293][position=10][trigger=/^(this article|this paper|the paper|the article)/]
You are a helpful assistant. Context information is below.
$\{
Meet.Global.views.messages = [];
Meet.Zotero.getRelatedText(Meet.Global.input)
\}
Using the provided context information, write a comprehensive reply to the given query. Make sure to cite results using [number] notation after the reference. If the provided context information refer to multiple subjects with the same name, write separate answers for each subject. Use prior knowledge only if the given context didn't provide enough information.

Answer the question: $\{Meet.Global.input\}

Reply in ${Zotero.locale}
`,
`
#🌟Translate[c=#D14D72][pos=11][trigger=/^translate/]
Translate these content to Simplified Chinese:
$\{
Meet.Global.input.replace("translate", "").replace("Translate", "") ||
Meet.Zotero.getPDFSelection() ||
Meet.Global.views.messages[0].content
\}

`,
`
#✨Improve writing[color=#8e44ad][pos=12][trigger=/^(polish|improve)/]
Below is a paragraph from an academic paper. Polish the writing to meet the academic style, improve the spelling, grammar, clarity, concision and overall readability. When necessary, rewrite the whole sentence. Furthermore, list all modification and explain the reasons to do so in markdown table. Paragraph: "$\{
Meet.Global.input.replace(/^(polish|improve|Polish|Improve)\s*/, "") ||
Meet.Global.views.messages[0].content
\}"
`,
`
#Clipboard[c=#576CBC][pos=13][trigger=/(clipboard|copied content)/]
This is the content in my clipboard:
$\{Meet.Zotero.getClipboardText()\}
---
$\{Meet.Global.input\}
`,
`
#Annotations[c=#F49D1A][pos=14][trigger=/(selected )?(annotation|highlight|note)/]
These are PDF Annotation contents:
$\{
Meet.Zotero.getPDFAnnotations(Meet.Global.input.match(/(selected)/))
\}

Please answer me in the language of my question. Make sure to cite results using [number] notation after the reference. 
My question is: $\{Meet.Global.input\}
`,
`
#Selection[c=#D14D72][pos=15][trigger=/^(this |selected )(text|passage)/]
Read these content:
$\{
Meet.Zotero.getPDFSelection() ||
Meet.Global.views.messages[0].content
\}
---
Answer me in the language of my question. This is my question: $\{Meet.Global.input\}
`,
  `
#Item[c=#159895][pos=16][trigger=/this (paper|article|document)/]
This is a Zotero item presented in JSON format:
$\{
JSON.stringify(ZoteroPane.getSelectedItems()[0].toJSON())
\}

Base on this JSON: $\{Meet.Global.input\}
`,
  `
#Items[c=#159895][pos=17][trigger=/these (papers|articles|documents)/]
These are Zotero items presented in JSON format:
$\{
Meet.Zotero.getRelatedText(Meet.Global.input)
\}

Please answer me using the lanaguage as same as my question. Make sure to cite results using [number] notation after the reference. 
My question is: $\{Meet.Global.input\}
`,
]
defaultTags = defaultTags.map(parseTag)


export { help, fontFamily, defaultTags, parseTag }