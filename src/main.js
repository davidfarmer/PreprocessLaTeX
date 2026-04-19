//import JSZip from 'jszip';

import {trimjunk, firstBracketedString, timesShow} from './utils.js';
import {separatePieces, scanForAnomalies} from './scan.js';
import {badPlainTeXdirectives} from './data.js'

try {
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const selectButton = document.getElementById('selectButton');
const uploadStatus = document.getElementById('uploadStatus');
} catch (error) {
    //  pass  // page does not have an upload feature
}

try {
const preprocessStatus = document.getElementById('preprocessStatus');
const fileList = document.getElementById('fileList');
const fileCount = document.getElementById('fileCount');
const selectedFileContent = document.getElementById('selectedFileContent');
} catch (error) {
    //  pass  // page does not have a place to report that information
}

let filesDictionary = {};
export let issuesDictionary = {
   "unpack": {"title": "Unpacking the file(s)",
              "value": ""},
   "process": {"title": "The following changes were made automatically",
               "value": [] },
   "deleted": {"title": "The following markup was deleted",
              "value": ""},
   "ambiguous": {"title": "The following may not convert as intended: [markup, default]",
              "value": []},
   "badmacros": {"title": "\\def, \\providecommand, and \\renewcommand were deleted.\nAll \newcommand in the body will be moved to preamble",
              "value": ""},
}

let baseFile = "";
let texFiles = {};
const trackedFileTypes = ["tex", "pdf", "eps", "png", "ps", "txt", "sty", "bib", "bbl"];
let filesTypes = {"other": 0}
for(let l=0; l<trackedFileTypes.length; ++l) { filesTypes[trackedFileTypes[l]] = 0 }

try {
  selectButton.addEventListener('click', () => {
    fileInput.click();
  });

  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });
} catch (error) {
    //  pass  // page does not have an upload feature
}

async function handleFile(file) {
  const fileName = file.name;
  const isTeX = fileName.endsWith('.tex');
  const isZip = fileName.endsWith('.zip');
  const isTarGz = fileName.endsWith('.tar.gz') || fileName.endsWith('.tgz');

  if (!isTeX && !isZip && !isTarGz) {
    showUploadStatus('File format not supported: please upload a .tex, .zip, or .tar.gz file', 'error');
    return;
  }

  showUploadStatus('Processing ' + fileName + "\n", 'loading');
  selectButton.disabled = true;

  try {
    if (isTeX) {
      await extractTeX(file);
    } else if (isZip) {
      await extractZip(file);
    } else {
      await extractTarGz(file);
    }

    const numfiles = Object.keys(filesDictionary).length;
    let files = "file";
    if(numfiles != 1){ files += "s" }
    showUploadStatus('\nFound ' + numfiles + ' ' + files, 'success', "append");
  } catch (error) {
    console.error('Error:', error);
    showUploadStatus(`Error: ${error.message}`, 'error');
  } finally {
    selectButton.disabled = false;
  }
   const thestructure = describeFiles();  // actually: do some prodessing and make one big file
// console.log("thestructure",thestructure);
// console.log("issuesDictionary",issuesDictionary);
   thestructure["diagnostics"] = issuesDictionary;
// console.log("thestructure",thestructure);
   return thestructure
//     displayFiles();
}

async function extractTeX(file) {
  const reader = new FileReader();

  const content = await file.text();

  filesDictionary = {
    [file.name]: content.replace(/(\n *){3,}/g, "\n\n")
  };

}

async function extractZip(file) {
  const zip = new JSZip();
  const contents = await zip.loadAsync(file);

  filesDictionary = {};

  for (const [path, zipEntry] of Object.entries(contents.files)) {
    if (!zipEntry.dir) {
      const content = await zipEntry.async('string');
      filesDictionary[path] = content;
    }
  }
}

async function extractTarGz(file) {
  const buffer = await file.arrayBuffer();
  const decompressed = await decompressGzip(buffer);
  const tarData = new Uint8Array(decompressed);

  filesDictionary = {};
  parseTar(tarData);
}

async function decompressGzip(buffer) {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(buffer));
      controller.close();
    },
  });

  const decompressedStream = stream.pipeThrough(
    new DecompressionStream('gzip')
  );

  const reader = decompressedStream.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result.buffer;
}

function parseTar(data) {
  let offset = 0;

  while (offset < data.length) {
    if (offset + 512 > data.length) break;

    const headerBytes = data.slice(offset, offset + 512);
    const header = parseTarHeader(headerBytes);

    if (!header.name) break;

    offset += 512;

    const fileSize = header.size;
    const paddedSize = Math.ceil(fileSize / 512) * 512;

    if (header.type === '0' || header.type === '') {
      const fileData = data.slice(offset, offset + fileSize);
      const content = new TextDecoder().decode(fileData);
      filesDictionary[header.name] = content.replace(/(\n *){3,}/g, "\n\n");;
    }

    offset += paddedSize;
  }
}

function parseTarHeader(headerBytes) {
  const decode = (start, end) => {
    return new TextDecoder().decode(headerBytes.slice(start, end)).split('\0')[0];
  };

  return {
    name: decode(0, 100),
    size: parseInt(decode(124, 136), 8) || 0,
    type: decode(156, 157),
  };
}

function describeFiles() {
  const files = Object.keys(filesDictionary).sort();
// console.log("filesTypes",filesTypes);
// console.log("Object.keys(filesDictionary)",Object.keys(filesDictionary));
  for(let l=0; l<files.length; ++l) {
     const fil = files[l];
     const extension = fil.replace(/^.*\.([^.]*)$/, "$1");
// console.log("fil",fil,"has extension:",extension);
     if(trackedFileTypes.includes(extension)) { ++filesTypes[extension] }
     else { ++filesTypes["other"] }
     if(extension == "tex") {
        const thisfile = filesDictionary[fil];
        texFiles[fil] = thisfile;
        if(thisfile.match(/\\begin *{document}/)) {
           baseFile = fil
        }

     filesDictionary[fil] = trimjunk(filesDictionary[fil]).replace(/(\n *){3,}/g, "\n\n");
     }
  }
  showUploadStatus(', of which:', 'success', "append");
  for(let l=0; l<trackedFileTypes.length; ++l) {
    const thisType=trackedFileTypes[l];
    const thisCount=filesTypes[thisType];
    if(thisCount) { showUploadStatus('\n' + thisType + ': ' + thisCount, 'success', "append") }
    }
    if(filesTypes["other"]) { showUploadStatus('\nother: ' + filesTypes["other"], 'success', "append") }

    showUploadStatus('\n\nMain LaTeX file: : ' + baseFile, 'success', "append");

// console.log("filesTypes", filesTypes);

//console.log("texFiles", texFiles)
// console.log("                  baseFile", baseFile);
   filesDictionary[baseFile] = expandInputs(filesDictionary[baseFile]).replace(/(\n *){3,}/g, "\n\n");
   let mainfile = filesDictionary[baseFile];

   mainfile = specialPreprocess(mainfile);

   mainfile = fixPlainTeX(mainfile, badPlainTeXdirectives);
   mainfile = fixPlainTeX(mainfile, badPlainTeXdirectives);  // twice: {\sf\bf ...}
//   mainfile = fixPlainTeX(mainfile,unnecessaryLaTeX);
   let tmppp = scanForAnomalies(mainfile);
   filesDictionary["TheMainFile.tex"] = tmppp.replace(/(\n *){3,}/g, "\n\n");
   const thestructure = displayFileContent("TheMainFile.tex");
   return thestructure
}

function expandInputs(text) {
  let expandedfiles = 0;
  // merge with other code to remove comments
//  text = text.replace(/[^\\]%.*/g, "");
  function replaceInput(match, offset, string) {
    ++expandedfiles;
    const theNewFile = match.replace(/.*{([^{}]+)}.*/,"$1");
// console.log("replacing an input",match, "XX", theNewFile);
    const filesWeHave = Object.keys(texFiles);
    let fileWeWant = "";
    const fileStem = baseFile.replace(/\/.*$/, "");
    if(filesWeHave.includes(theNewFile)) { fileWeWant = theNewFile}
    else if(filesWeHave.includes(theNewFile + ".tex")) { fileWeWant = theNewFile + ".tex"}
    else if(filesWeHave.includes(fileStem + "/" +theNewFile + ".tex")) { fileWeWant =  fileStem + "/" + theNewFile + ".tex"}
    else if(filesWeHave.includes(fileStem + "/" +theNewFile)) { fileWeWant =  fileStem + "/" + theNewFile}
    else { console.log(" not the file we want:", theNewFile);
          alert("missing file: " + theNewFile) }

    if(fileWeWant) { // console.log("expanding ", fileWeWant); 
       return filesDictionary[fileWeWant] }
    else {
       alert("missing file: " + theNewFile)
       return "XYZW"
    }
    }
//  }
  if(text.match(/\\(input|include) *{[^{}]+}/)){
// console.log("found input|include");
     text = text.replace(/(\\(input|include) *{([^{}]+)})/g, replaceInput);
  }
  if(text.match(/\\(input|include) *{[^{}]+}/)){
  // merge with other code to remove comments
//  text = text.replace(/[^\\]%.*/g, "");
// console.log("found a deeper input|include");
     text = text.replace(/(\\(input|include) *{([^{}]+)})/g, replaceInput);
  }
  if(text.match(/\\(input|include) *{[^{}]+}/)){
// console.log("found a yet deeper input|include");
     text = text.replace(/(\\(input|include) *{([^{}]+)})/g, replaceInput);
  } else { console.log("did not need a 3rd level") }

  if(expandedfiles) {showUploadStatus('\nExpanded ' + expandedfiles + ' input/include files.', 'success', "append") }

  return text
}

function fixPlainTeX(str, lookingFor) {

//console.log("in main", lookingFor);
   const thesetagsType = lookingFor[0];
   const thesetagsName = lookingFor[1];
   for (const lookfor of lookingFor[2]) {
  //    const thesetagsOr = lookingFor[1].join("|");
//      console.log("checking lookfor",lookfor);
      var lookforname;
      var replacement;
      // if we are looking for a string, we want to delete it
      if(typeof lookfor === 'string') {
         lookforname = "\\\\" + lookfor + "\\b";
         replacement = ""
      } else if (thesetagsName == "tex_fonts") {
        lookforname = "{ *\\\\" + lookfor[0] + "\\b *";
        replacement = "\\" + lookfor[1] + "{"
      } else {
        lookforname = "\\\\" + lookfor[0] + "\\b *";
        replacement = "\\" + lookfor[1]
      }
   
     let re = new RegExp(lookforname, 'g');
   
//console.log("re",re);
     const thisMatch = str.match(re);
//     if(str.match(re)) {
     if(thisMatch) {
   
//console.log("str.match(re)", str.match(re));
        showProcessStatus(lookfor, thisMatch.length);
        str = str.replace(re, replacement)
     }
  }
//    str = specialPreprocess(str);
    return str
}

function specialPreprocess(text) {

    let findEqref = "\\(\\\\ref{([^{}]+)}\\)";
    let re = new RegExp(findEqref, 'g');
    const thisMatch = text.match(re);

//console.log("str.match(re)", str.match(re));
     if(thisMatch) {
        const replacement = "\\eqref{$1}"
        showProcessStatus(["(\\ref{...})",  "\\eqref{...}"], thisMatch.length);
        text = text.replace(re, replacement)
     }

    text = text.replace(/\\vskip\*? *([0-9]+|-) *([a-zA-Z]+).*/g, "\\vspace{$1$2}");
    text = text.replace(/(\\vspace)\*? */g, "$1");
    text = text.replace(/(\\vspace) *{([0-9]+|-) *([a-zA-Z]+).*?}/g, "$1{$2$3}");

    return text
}

function displayFiles() {

  const files = Object.keys(filesDictionary).sort();
  fileCount.textContent = files.length;
  fileList.innerHTML = '';
  selectedFileContent.innerHTML = '';

  files.forEach((fileName, index) => {
    const item = document.createElement('div');
    item.className = 'file-item';
    if (index === 0) item.classList.add('active');

    item.innerHTML = `<div class="file-name">${escapeHtml(fileName)}</div>`;

    item.addEventListener('click', () => {
      document.querySelectorAll('.file-item').forEach(el => {
        el.classList.remove('active');
      });
      item.classList.add('active');
//      displayFileContent(fileName);
    });

    fileList.appendChild(item);
  });

  if (files.length > 0) {
    try {
//    displayFileContent("TheMainFile.tex");
    }
    catch(error) {
//    displayFileContent(files[0]);
   }
  }
}

function displayFileContent(fileName) {
//  const content = filesDictionary[fileName];
//  const displayContent = content.replace(/(\n *){3,}/g, "\n\n");


//    <div class="file-content">${escapeHtml(displayContent)}</div>
//  selectedFileContent.innerHTML = `
//    <div class="file-content">${displayContent}</div>
//  `;

  let full_structure;

  try {
     document.getElementById('structureButton').addEventListener('click', () => {

     const displayContent = filesDictionary[fileName];
     full_structure = splitup(displayContent);
console.log("full_structure", full_structure);
     let visible_structure = showstructure(full_structure);
     document.getElementById('structureSection').innerHTML = visible_structure;
  });
  } catch {
    //  pass  // page does not have a place to embed that information
  }
  const displayContent = filesDictionary[fileName];
  full_structure = splitup(displayContent);
  return full_structure
}

function showUploadStatus(message, type, action="new") {
  if(action == "new") { 
      issuesDictionary["unpack"]["value"] = message;
  } else {
      issuesDictionary["unpack"]["value"] += message;
  }
  try {
     uploadStatus.className = `status show ${type}`;
     if(action == "new") { 
         uploadStatus.textContent = message;
     } else {
         uploadStatus.textContent += message;
     }
  } catch {
       //  pass  // page does not have a place to report that information
  }
}

function showProcessStatus(substitution, num) {
//alert("here");
   let message =  substitution[0] + " replaced by " + substitution[1];
   if(!substitution[1]) {  message = "\\" + substitution[0] + " deleted "}
   message += " " + timesShow(num) + "\n"; // + " times\n";
   issuesDictionary["process"]["value"].push(message);

   try {
     document.getElementById('preprocessSection').className = `show status`;
     preprocessStatus.textContent += message;
   } catch {
    //  pass  // page does not have a place to report that information
   }
} 

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function splitup(text) {

   let theabstract = "";
   if(text.match(/\\begin{abstract}/)) {
     theabstract = text.replace(/^(.*)\\begin{abstract}(.*?)\\end{abstract}(.*)$/s,"$2");
     text = text.replace(/^(.*)\\begin{abstract}(.*?)\\end{abstract}(.*)$/s,"$1$3");
   }
   let packages = text.match(/\\usepackage.*/g);
   text = text.replace(/\\usepackage.*/g, "");

   let textTitle = "";
   let beforeaftertitle = text.split(/\\title\b/);
// console.log("beforeaftertitle[0]", typeof beforeaftertitle[0],beforeaftertitle[0].substring(0,50));
// console.log("beforeaftertitle[1]", typeof beforeaftertitle[1],beforeaftertitle[1].substring(0,50));
   if(beforeaftertitle.length != 2) { alert("Did not find a title") }
   if(beforeaftertitle[1].startsWith("[")) {  //strip off the short title
     beforeaftertitle[1] = firstBracketedString(beforeaftertitle[1], 0, "[", "]")[1].trim();
   }
   [textTitle, beforeaftertitle[1]] = firstBracketedString(beforeaftertitle[1]);
   textTitle = textTitle.substring(1, textTitle.length - 1);

   text = beforeaftertitle[0] + beforeaftertitle[1];

   let macros = [];
   let macrosplit = text.split(/\\newcommand\b/);

   let beforemacros = macrosplit.shift();
   let mac;
   for(mac of macrosplit) {
      mac = mac.trim();
      let thisterm = "";
      let thisdef = "";
      let thisbrack = "";
      if(mac.startsWith("\\")) {
        thisterm = mac.replace(/^([^{]+)({.*)$/s,"$1");
        thisterm = "{" + thisterm.trim() + "}";
        mac = mac.replace(/^([^{]+)({.*)$/s,"$2");
      } else {
        [thisterm, mac] = firstBracketedString(mac);
      }
      mac = mac.trim();
      while(mac.startsWith("[")) {
        let morebrack = "";
        [morebrack, mac] = firstBracketedString(mac, 0, "[", "]");
        thisbrack += morebrack.trim();
        mac = mac.trim()
      }
      [thisdef, mac] = firstBracketedString(mac);
      beforemacros += mac;
      macros.push("\\newcommand" + thisterm + thisbrack + thisdef);
   }

   text = beforemacros + mac;

   let preambleBodyBiblio = separatePieces(text);

   let preamble = preambleBodyBiblio[0];
   let maintext = preambleBodyBiblio[1];
   let bibliography = preambleBodyBiblio[2];

//   if(maintext.match(/\\title(\[|{)/)) {  // wrong: need to allow {} in title
//console.log("found a title");
//      maintext = maintext.replace(/(\\title)\[[^\[\]]*\]\s*/,"$1");
//      console.log("found a title");
//      textTitle = maintext.replace(/^(.*)(\\title *{([^{}]+)})(.*)/s,"$3")
//      maintext = maintext.replace(/^(.*)(\\title *{([^{}]+)})(.*)/s,"$1$4")
//   } else if (preamble.match(/\\title(\[|{)/)) {  // wrong: need to allow {} in title
//      console.log("found a title in preamble");
//      preamble = preamble.replace(/(\\title)\[[^\[\]]*\]\s*/,"$1");
//      textTitle = preamble.replace(/^(.*)(\\title *{([^{}]+)})(.*)/s,"$3")
//      preamble = preamble.replace(/^(.*)(\\title *{([^{}]+)})(.*)/s,"$1$4")
//   }
//    console.log("A textTitle", textTitle);

   let remacros = preamble.match(/\\(renew|provide)command.*/g);
//    console.log("remacros", remacros);
   preamble = preamble.replace(/\\(renew|provide)command.*/g, "");
   let rebodymacros = maintext.match(/\\(renew|provide)command.*/g);
//    console.log("body macros", rebodymacros);
   maintext = maintext.replace(/\\(renew|provide)command.*/g, "");

   let mathoperators = preamble.match(/\\DeclareMathOperator.*/g);
   preamble = preamble.replace(/\\DeclareMathOperator.*/g, "");

   let text_structured = {
       "title": textTitle.trim(),
       "abstract": theabstract.trim(),  // what if empty?
//       "macros": macros.concat(bodymacros),
       "macros": macros,
       "mathoperators": mathoperators,
       "packages": packages,
       "preamble": preamble.trim().replace(/\n{2,}/g, "\n"),
       "contents": maintext.trim(),
       "bibliography": bibliography.trim(),
   }
   let maintext_list = spliton(text_structured["contents"],["part", "chapter", "section"]);


   
   text_structured["contents"] = maintext_list;

//  console.log("text_structured[contents]", text_structured["contents"]);

   return text_structured
}

function spliton(text, separators) {
  if(separators.length == 0) { return text.trim() }
  let this_separator = separators[0];
  let remaining_separators = [];
  for(let i=0; i<separators.length-1; ++i) { remaining_separators.push(separators[i+1]) }
// console.log("remaining_separators",remaining_separators);
  let re = new RegExp("\\\\" + this_separator + "\\b", 'g');
//  let text_list = text.split("\\" + this_separator + "\b");
  let text_list = text.split(re);
  let new_text_list = [];
// console.log("length of text_list", text_list.length);
  if(text_list.length == 1) { return spliton(text_list[0], remaining_separators) }
  for (let [i, value] of text_list.entries()) {
       value = value.trim();
       const this_title = "";
       if(!value.startsWith("{")) {
         if(i == 0 && value) {
//           text_list[i] = {"type": "introduction",
//                           "contents": spliton(value, remaining_separators)
           new_text_list.push({"type": "introduction",
                           "contents": spliton(value, remaining_separators)
                              }
                             )
         } else if(i == 0) { // introduction is empty, so ignore
        //   text_list.unshift()
         } else {
           alert("no " + this_separator + " " + i + " no title: " + value.substring(0,50))
         }
       } else { 
         let [this_title, this_div_contents] = firstBracketedString(value);
         this_title = this_title.substring(1,this_title.length - 1);
         this_div_contents = this_div_contents.trim();
         let thislabel = "";
         let thispiece = {};
// console.log("this_div_contents", "X", this_div_contents.substring(0,20));
         if(this_div_contents.startsWith("\\label{")) {
           thislabel = this_div_contents.replace(/^\\label{([^{}]+)}(.*)/s, "$1");
// console.log("found a lebel", thislabel);
           this_div_contents = this_div_contents.replace(/^\\label{([^{}]+)}(.*)/s, "$2");
         }
         if(thislabel) { thispiece["label"] = thislabel }
         thispiece["type"] = this_separator;
         thispiece["title"] = this_title;
         thispiece["contents"] = spliton(this_div_contents, remaining_separators);

         new_text_list.push(thispiece);
         
//         new_text_list.push({"type": this_separator,
//                         "title": this_title,
//                         "contents": spliton(this_div_contents, remaining_separators)
//                        }
//                        )
       }
   }
   return new_text_list
}

function showstructure(struct) {

   if(!struct) { return "" }
   else if(Array.isArray(struct)) {
     let this_entry = '<div class="struct list">\n';
     for (let [i, value] of struct.entries()) {
       this_entry += '<div class="elem">' + showstructure(value) + '</div>'
     }
     this_entry += "</div>\n";
     return this_entry
   } else if(struct.constructor == Object) {
     let this_entry = '<div class="struct dict">\n';
       for (const [key, value] of Object.entries(struct)) {
          let this_elem = '<div class="elem">';
          this_elem += '<span class="key">' + key + '</span>';
          this_elem += '<span class="value">' + showstructure(value) + '</span>';
          this_elem += '</div>\n';

          this_entry += this_elem
     }
     this_entry += "</div>\n";
     return this_entry
   } else if(typeof struct  == "string") {
     struct = struct.trim();
     if(struct.length > 100) { const shorterlength = struct.length - 100; struct = struct.substring(0,100) + " + [" + shorterlength + "]"}
     return struct
   } else { alert("unknown content:" +  typeof struct + ":" + struct) }
}

function reassemble(struct) {

   let opening_tag = "\n";
   let closing_tag = "\n";
   let this_entry = "";

   if(!struct) { return "" }

   else if(Array.isArray(struct)) {
     for (let [i, value] of struct.entries()) {
       this_entry += reassemble(value) + '\n\n'
     }
     return this_entry

   } else if(struct.constructor == Object) {

     if("type" in struct) {
       opening_tag += "<" + struct["type"];
       closing_tag += "<" + struct["type"] + "/>";
     } else {
       opening_tag += "<" + "document";
       closing_tag += "<" + "document" + "/>\n";
     }
     if("label" in struct) { opening_tag += ' xml:id="' + struct["label"] + '"'}
     opening_tag += '>' + '\n';


     this_entry = opening_tag;

       for (const [key, value] of Object.entries(struct)) {
          if(value && !["contents", "type", "label", "bibliography"].includes(key)) {
            this_entry += '\n<' + key + '>';
            if(key != "title") { this_entry += "\n" }
            this_entry += reassemble(value).trim();
            if(key != "title") { this_entry += "\n" }
            this_entry += '</' + key + '>' + '\n';
            if(key == "title") { this_entry += "\n" }
          }
       }
       this_entry += reassemble(struct["contents"]);
       if("bibliography" in struct) { this_entry += '<bibliography>\n' + reassemble(struct["bibliography"]) + '\n</bibliography>\n' }
       return this_entry + closing_tag;

   } else if(typeof struct  == "string") {
     struct = struct.trim();
     return struct
   } else { alert("unknown content:" +  typeof struct + ":" + struct) }

}
