import {
  getClipboardText,
  getItemField,
  getPDFSelection,
  getRelatedText,
  getPDFAnnotations
} from "./Zotero"

import {
  getEditorText,
  insertEditorText,
  replaceEditorText,
  follow,
  reFocus
} from "./BetterNotes"

import {
  getGPTResponse
} from "./OpenAI"
import Views from "../views";

const Meet: {
  [key: string]: any;
  Global: {
    [key: string]: any;
    views: Views | undefined
  }
} = {
  /**
   * Open to users
   * Example: Meet.Zotero.xxx()
   */
  Zotero: {
    /**
     * Return system clipboard copied content
     */
    getClipboardText,
    /**
     * Return a field value of selected item, if multiple are selected return the field value of the first selected
     * @fieldName Receives the name of the field
     * For example abstract, Meet.Zotero.getItemField("abstractNote")
     */
    getItemField, 
    /**
     * Return selected text when reading PDF
     */
    getPDFSelection,
    /**
     * Return related paragraphs, if you select multiple items, return the 5 most relevant items to the question
     * If you are in PDF, it will read the entire PDF and return the 5 most relevant paragraphs to the question
     * @queryText Receives a query string
     * Meet.Zotero.getItemField("What does XXX mentioned in this article mean?")
     */
    getRelatedText,
    /**
     * Get PDF annotation content
     * @select Receives a boolean, whether to return selected annotations
     * getPDFAnnotations(true) will return selected annotations
     * getPDFAnnotations() returns all annotations by default
     */
    getPDFAnnotations,
  },
  /**
   * Partially open
   * The following functions only target main notes
   */
  BetterNotes: {
    getEditorText,
    insertEditorText,
    replaceEditorText,
    follow,
    reFocus
  },
  OpenAI: {
    getGPTResponse
  },
  Global: {
    lock: undefined,
    input: undefined,
    views: undefined,
    popupWin: undefined,
    storage: undefined
  }
}

export default Meet