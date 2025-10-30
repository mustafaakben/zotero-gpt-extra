# AI Prompts Documentation

This document describes all the built-in AI prompts available in Zotero GPT and where to find them.

## Where are the prompts located?

The default AI prompts are defined in the source code at:
- **File**: [`src/modules/base.ts`](src/modules/base.ts)
- **Lines**: 85-162
- **Variable**: `defaultTags`

## How to view and customize prompts

You can view and customize prompts directly in the Zotero GPT interface:

1. Open Zotero GPT (press `Shift + /` or `Shift + ?`)
2. **Long press** any tag/button to see its internal prompt and code
3. Modify the prompt content as needed
4. Press `Ctrl + S` to save your changes
5. Press `Ctrl + R` to test/run the prompt

You can also create your own custom tags by typing `#TagName` and pressing `Enter`.

## Built-in Prompts

### 1. 🪐 AskPDF

**Purpose**: Ask questions about the content of a PDF document using context from the paper.

**Trigger**: Questions starting with "本文", "这篇文章", or "论文" (Chinese triggers for "this article", "this paper")

**Prompt Template**:
```
You are a helpful assistant. Context information is below.
${
  Meet.Global.views.messages = [];
  Meet.Zotero.getRelatedText(Meet.Global.input)
}
Using the provided context information, write a comprehensive reply to the given query. 
Make sure to cite results using [number] notation after the reference. 
If the provided context information refer to multiple subjects with the same name, 
write separate answers for each subject. Use prior knowledge only if the given context 
didn't provide enough information.

Answer the question: ${Meet.Global.input}

Reply in [user's locale]
```

**How it works**: This prompt extracts relevant text from your PDF using semantic search, then asks GPT to answer your question based on that context, with proper citations.

---

### 2. 🌟 Translate

**Purpose**: Translate content to Simplified Chinese (can be modified for other languages).

**Trigger**: Text starting with "翻译" (Chinese for "translate")

**Prompt Template**:
```
Translate these content to 简体中文:
${
  Meet.Global.input.replace("翻译", "") ||
  Meet.Zotero.getPDFSelection() ||
  Meet.Global.views.messages[0].content
}
```

**How it works**: Translates either your input text, currently selected PDF text, or the last message in the conversation.

---

### 3. ✨ Improve Writing

**Purpose**: Polish and improve academic writing with detailed explanations of changes.

**Trigger**: Text starting with "润色" (Chinese for "polish")

**Prompt Template**:
```
Below is a paragraph from an academic paper. Polish the writing to meet the academic style, 
improve the spelling, grammar, clarity, concision and overall readability. When necessary, 
rewrite the whole sentence. Furthermore, list all modification and explain the reasons to 
do so in markdown table. 

Paragraph: "${
  Meet.Global.input.replace("润色", "") ||
  Meet.Global.views.messages[0].content
}"
```

**How it works**: GPT analyzes the text and provides both improved text and a detailed table of all changes made with explanations.

---

### 4. 📋 Clipboard

**Purpose**: Work with content from your clipboard.

**Trigger**: Text containing "剪贴板" or "复制内容" (Chinese for "clipboard" or "copied content")

**Prompt Template**:
```
This is the content in my clipboard:
${Meet.Zotero.getClipboardText()}
---
${Meet.Global.input}
```

**How it works**: Provides clipboard content as context for your question.

---

### 5. 📝 Annotations

**Purpose**: Work with PDF annotations and highlights.

**Trigger**: Text containing "注释", "高亮", or "标注" (Chinese for "annotations", "highlights", "markings"), optionally preceded by "选中", "选择的", or "选择" (Chinese for "selected")

**Prompt Template**:
```
These are PDF Annotation contents:
${
  Meet.Zotero.getPDFAnnotations(Meet.Global.input.match(/(选中|选择的|选择|所选)/))
}

Please answer me in the language of my question. Make sure to cite results using [number] 
notation after the reference. 

My question is: ${Meet.Global.input}
```

**How it works**: Extracts your PDF annotations (all or only selected ones) and uses them to answer your question with citations.

---

### 6. 📄 Selection

**Purpose**: Work with selected PDF text.

**Trigger**: Text starting with "这段", "选中" (Chinese for "this paragraph", "selected") followed by "文本", "话", "文字", or "描述" (Chinese for "text", "words", "description")

**Prompt Template**:
```
Read these content:
${
  Meet.Zotero.getPDFSelection() ||
  Meet.Global.views.messages[0].content
}
---
Answer me in the language of my question. This is my question: ${Meet.Global.input}
```

**How it works**: Uses currently selected PDF text or previous message as context for your question.

---

### 7. 📚 Item

**Purpose**: Work with a single Zotero item's metadata.

**Trigger**: Text containing "这篇" followed by "文献", "论文", or "文章" (Chinese for "this literature/paper/article")

**Prompt Template**:
```
This is a Zotero item presented in JSON format:
${
  JSON.stringify(ZoteroPane.getSelectedItems()[0].toJSON())
}

Base on this JSON: ${Meet.Global.input}
```

**How it works**: Provides the currently selected Zotero item's metadata in JSON format for GPT to analyze.

---

### 8. 📚 Items

**Purpose**: Work with multiple Zotero items.

**Trigger**: Text containing "这些" followed by "文献" or "论文" (Chinese for "these literature/papers")

**Prompt Template**:
```
These are Zotero items presented in JSON format:
${
  Meet.Zotero.getRelatedText(Meet.Global.input)
}

Please answer me using the language as same as my question. Make sure to cite results 
using [number] notation after the reference. 

My question is: ${Meet.Global.input}
```

**How it works**: Searches for related items in your Zotero library based on your question and provides their metadata for analysis.

---

## Customizing Prompts

### Modifying Built-in Prompts

While you cannot delete built-in prompts, you can modify them:

1. Long press the tag to open the editor
2. Modify the prompt text after the first line (the `#TagName[...]` line)
3. You can also change:
   - **Color**: `[color=#HEXCODE]` or `[c=#HEXCODE]`
   - **Position**: `[position=NUMBER]` or `[pos=NUMBER]`
   - **Trigger**: `[trigger=PATTERN]` or `[tr=PATTERN]` (supports regex)
4. Press `Ctrl + S` to save

### Creating Custom Prompts

1. Type `#YourTagName` and press `Enter`
2. Write your prompt (you can use code blocks with `${...}`)
3. Press `Ctrl + R` to test
4. Press `Ctrl + S` to save

### Available APIs for Code Blocks

You can use these APIs in your custom prompts within `${...}` code blocks:

- `Meet.Global.input` - Current user input
- `Meet.Zotero.getPDFSelection()` - Get selected text from PDF
- `Meet.Zotero.getPDFAnnotations(onlySelected)` - Get PDF annotations
- `Meet.Zotero.getClipboardText()` - Get clipboard content
- `Meet.Zotero.getRelatedText(query)` - Search and get related text
- `Meet.Global.views.messages` - Conversation history
- `ZoteroPane.getSelectedItems()` - Get selected Zotero items

For more APIs, see: [`src/modules/Meet/api.ts`](src/modules/Meet/api.ts)

## Examples

### Example: Custom Summarization Prompt

```
#Summarize[color=#FF5733][position=20][trigger=/^summarize/i]
Please provide a concise summary of the following content in 3-5 bullet points:

${Meet.Zotero.getPDFSelection() || Meet.Global.views.messages[0].content}

Focus on the main ideas, key findings, and important conclusions.
```

### Example: Custom Research Question Generator

```
#ResearchQuestions[color=#3498db][position=21]
Based on this paper's abstract and content:

${Meet.Zotero.getRelatedText(Meet.Global.input)}

Generate 5 interesting research questions that could be explored as follow-up studies.
```

## Tips

- Use `${...}` code blocks to dynamically insert content
- Regular expressions in triggers should be in JavaScript format: `/pattern/flags`
- The `position` attribute controls the order of tags (lower numbers appear first)
- Use color coding to organize different types of prompts
- Test prompts with `Ctrl + R` before saving with `Ctrl + S`

## Contributing

If you create useful custom prompts, consider sharing them in the [GitHub Discussions](https://github.com/MuiseDestiny/zotero-gpt/discussions/3)!
