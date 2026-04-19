
export let badPlainTeX = [
   ["presentation","latex_fonts", ["textrm","textit","textbf", "textsc","texttt"]],
];

export let badPlainTeXdirectives = [  // replace, or just delete
 "presentation","tex_fonts", [
  ["rm","textrm"],
  ["em","emph"],
  ["it","textit"],
  ["itshape","textit"],
  ["bf","textbf"],
  ["bfseries","textbf"],
  ["sf","textsf"],
  [ "sffamily","textss"],
  ["textsl","testsl"],
  ]
];

//export let unnecessaryLaTeX = [
//  "markup", "foo", [
//  ["cref","ref"],  // cleverref
//  ["Cref","ref"],  // cleverref
//  ["eqref","ref"] // PreTeXt does not distinquish
//  ]
//];

// NewDocumentCommand
//  declaretheorem , declaretheoremstyle
// newenvironment
// medskip

export let specialBadMacros = [
   ["accessibility","consistency", ["renewcommand"]],
];

export let badEverywhereMacros = [
   ["unused","conditionals", ["if","fi","iffalse","then","else","loop","repeat"]],
   ["presentation","font_size", ["tiny","scriptsize","footnotesize","small","normalsize",
                  "large","Large","LARGE", "huge", "Huge", "normalfont"]],
   ["presentation","spacing_vertical", ["smallskip","medskip","bigskip", "vfil","vfill"]],
   ["presentation","archaic_tex", ["centerline", "centering", "noindent", "par","linebreak"]],
   ["mistake","nonstructural", ["ensuremath"]],
   ["archaic","low_level_tex", ["relax","makeatletter","makeatother",
        "csname","endcsname", "shipout", "noexpand","expandafter","clearpage"]],
   ["archaic","file_manipulation", ["newwrite","newread","immediate","write","write18",
        "read","readline","readfile",
        "openin","openout", "jobname"]],
];

export let badEverywhereMacrosLine = [  // take everything after this to end of line
   ["archaic","low_level_tex", ["catcode", "newtheorem", "maketitle", "setlength"]]
]
export let publisherOptions = [  // take everything after this to end of line
   ["publisher","zzzzz", ["theoremstyle","makeindex", "allowdisplaybreaks","frontmatter",
               "mainmatter", "appendix","numberwithin","setcounter","tableofcontents","FloatBarrier"]]
]
export let eliminateAndSave = [
   ["archaic","use_newcommand_only",["def","let","edef","gdef","xdef","global","long"]],
]

// not scanning for these:  "global","long"

export let badEverywhereMacrosPlus = [  // have a required argument
//   ["presentation","spacing_vertical", [["vspace",1]]],
   ["presentation","spacing_horizontal", [["hspace",1]]],
   ["other","other", [["date",1]]],
   ["accessibility","colors", [["color",1],["textcolor",1], ["mathcolor",1],["definecolor",3]]],
];

export let badBodyEnvironments = [
          ["presentation","nonstructural", ["center", "minipage"]]
];

export let typeOfError = {
    "unused": "LaTeX-specific markup",
    "presentation": "Presentation does not go into PreTeXt source",
    "accessibility": "Accessibility issue",
    "mistake": "This feature should not have been added to LaTeX",
    "archaic": "plain TeX that should not be in LaTeX source"
};

// need to handle def and let somewhere
// and edef, gdef, xdef
// and global, long
// newif

export let alternatives = {
    "textit": [["emph","emphasis"], ["term","terminology"],["alert","warning"]],
    "textbf": [["emph","emphasis"], ["term","terminology"],["alert","warning"]],
    "texttt": [["code","code"]],
};
