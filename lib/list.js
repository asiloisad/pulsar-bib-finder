const { CompositeDisposable } = require("atom");
const {
  SelectListView,
  highlightMatches,
} = require("pulsar-select-list");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { glob } = require("glob");
const bibtexParse = require("bibtex-parse");

module.exports = class BibList {
  constructor(S) {
    this.S = S;
    this.items = null;
    this.nextId = null;
    this.selectList = new SelectListView({
      maxResults: 50,
      className: "bib-finder",
      emptyMessage: "No matches found",
      helpMarkdown:
        "Available commands:\n" +
        '- **Enter** — Insert citation key\n' +
        '- **Alt+Enter** — Insert `\cite{key}`\n' +
        '- **Ctrl+Enter** — Insert `\cite[]{key}` with cursor in brackets\n' +
        '- **F5** — Refresh bibliography cache',
      filterKeyForItem: (item) => item.text,
      removeDiacritics: true,
      algorithm: "fuzzaldrin",
      willShow: () => this.update(this.nextId),
      elementForItem: (item, { matchIndices }) => {
        const li = document.createElement("li");
        const matches = matchIndices || [];
        li.classList.add("two-lines");
        const priBlock = document.createElement("div");
        priBlock.classList.add("primary-line");
        const typeOffset = item.key.length + 1 + item.description.length + 2;
        const typeBlock = document.createElement("span");
        typeBlock.classList.add("tag");
        typeBlock.appendChild(
          highlightMatches(item.type, matches.map((x) => x - typeOffset))
        );
        priBlock.appendChild(typeBlock);
        priBlock.appendChild(highlightMatches(item.key, matches));
        li.appendChild(priBlock);
        const descOffset = item.key.length + 1;
        const secBlock = document.createElement("div");
        secBlock.classList.add("secondary-line");
        secBlock.appendChild(
          highlightMatches(item.description, matches.map((x) => x - descOffset))
        );
        li.appendChild(secBlock);
        if (this.showSource) {
          const pathBlock = document.createElement("div");
          const iconClass = this.S.getIconClass
            ? this.S.getIconClass(item.pPath)
            : ["icon-file-text"];
          pathBlock.classList.add("icon", "icon-line", ...iconClass);
          pathBlock.textContent = item.fPath;
          li.appendChild(pathBlock);
        }
        return li;
      },
      didConfirmSelection: (item) => this.performAction(item, "name"),
      didCancelSelection: () => this.selectList.hide(),
    });
    this.disposables = new CompositeDisposable(
      atom.commands.add(this.selectList.element, {
        "select-list:name": () => this.performAction(null, "name"),
        "select-list:cite": () => this.performAction(null, "cite"),
        "select-list:square": () => this.performAction(null, "square"),
        "select-list:update": () => this.refresh(),
      }),
      atom.commands.add("atom-workspace", {
        "bib-finder:cite": () => this.toggle(),
        "bib-finder:cite-from-local": () => this.toggle("local"),
        "bib-finder:cite-from-source-1": () => this.toggle(1),
        "bib-finder:cite-from-source-2": () => this.toggle(2),
        "bib-finder:cite-from-source-3": () => this.toggle(3),
        "bib-finder:cite-from-source-4": () => this.toggle(4),
        "bib-finder:cite-from-source-5": () => this.toggle(5),
      }),
      atom.config.observe("bib-finder.bibLocal", (value) => {
        this.bibLocal = value;
        this.items = null;
      }),
      atom.config.observe("bib-finder.allowDuplicate", (value) => {
        this.allowDuplicate = value;
        this.items = null;
      }),
      atom.config.observe("bib-finder.reloadAlways", (value) => {
        this.reloadAlways = value;
      }),
      atom.config.observe("bib-finder.showSource", (value) => {
        this.showSource = value;
        this.selectList.update({});
      }),
      atom.config.observe("bib-finder.bibPaths.path1", (value) => {
        this.bibPath1 = value;
        this.items = null;
      }),
      atom.config.observe("bib-finder.bibPaths.path2", (value) => {
        this.bibPath2 = value;
        this.items = null;
      }),
      atom.config.observe("bib-finder.bibPaths.path3", (value) => {
        this.bibPath3 = value;
        this.items = null;
      }),
      atom.config.observe("bib-finder.bibPaths.path4", (value) => {
        this.bibPath4 = value;
        this.items = null;
      }),
      atom.config.observe("bib-finder.bibPaths.path5", (value) => {
        this.bibPath5 = value;
        this.items = null;
      }),
      atom.config.observe("bib-finder.bibPaths.array", (value) => {
        this.bibPathArray = value;
        this.items = null;
      })
    );
  }

  destroy() {
    this.disposables.dispose();
    this.selectList.destroy();
  }

  show(id) {
    this.nextId = id;
    this.selectList.show();
  }

  toggle(id) {
    this.nextId = id;
    this.selectList.toggle();
  }

  refresh(id) {
    this.items = null;
    this.update(id);
  }

  update(id) {
    if (!this.items || this.reloadAlways || this.id !== id) {
      this.selectList.update({
        items: [],
        loadingMessage: "Indexing project\u2026",
        errorMessage: null,
      });
      this.cache(id).then(() => {
        this.selectList.update({
          items: this.items,
          loadingMessage: null,
        });
      });
    }
  }

  async cache(id) {
    let paths = [];
    if (id === "local" || (!id && this.bibLocal)) {
      for (const pPath of atom.project.getPaths()) {
        const files = await glob("**/*.bib", { cwd: pPath });
        for (const fPath of files) {
          paths.push(path.join(pPath, fPath));
        }
      }
    }
    if (id === 1 || !id) {
      if (this.bibPath1) paths.push(this.bibPath1);
    }
    if (id === 2 || !id) {
      if (this.bibPath2) paths.push(this.bibPath2);
    }
    if (id === 3 || !id) {
      if (this.bibPath3) paths.push(this.bibPath3);
    }
    if (id === 4 || !id) {
      if (this.bibPath4) paths.push(this.bibPath4);
    }
    if (id === 5 || !id) {
      if (this.bibPath5) paths.push(this.bibPath5);
    }
    if (!id && this.bibPathArray) {
      paths.push(...this.bibPathArray);
    }
    this.id = id;
    this.items = [];
    const keys = [];
    for (const fPath of paths) {
      try {
        const text = await fsp.readFile(fPath, "utf-8");
        const entries = bibtexParse.entries(text);
        for (const entry of entries) {
          if (keys.includes(entry.key)) {
            continue;
          }
          let description = [];
          for (const key in entry) {
            if (key === "key" || key === "type") {
              continue;
            }
            description.push(entry[key]);
          }
          description = this.formatText(description.join(" "));
          this.items.push({
            key: entry.key,
            description: description,
            type: entry.type,
            text: entry.key + " " + description + " @" + entry.type,
            fPath: fPath,
          });
          if (!this.allowDuplicate) {
            keys.push(entry.key);
          }
        }
      } catch (err) {
        if (err.code === "ENOENT") {
          atom.notifications.addError(`The bib file ${fPath} does not exist`);
        } else {
          console.error(`bib-finder: Error parsing ${fPath}:`, err);
        }
      }
    }
  }

  performAction(item, mode) {
    if (!item) {
      item = this.selectList.getSelectedItem();
    }
    if (!item) {
      return;
    }
    this.selectList.hide();
    if (!mode) {
      mode = "name";
    }
    let editor = atom.workspace.getActiveTextEditor();
    if (!editor) {
      return;
    }
    if (mode === "name") {
      editor.insertText(item.key);
    } else if (mode === "cite") {
      editor.insertText(`\\cite{${item.key}}`);
    } else if (mode === "square") {
      editor.transact(() => {
        editor.insertText(`\\cite[]{${item.key}}`);
        for (let cursor of editor.getCursors()) {
          let bufPos = cursor.getBufferPosition();
          cursor.setBufferPosition([
            bufPos.row,
            bufPos.column - item.key.length - 3,
          ]);
        }
      });
    }
  }

  formatText(text) {
    return text
      .trim()
      .replace(/~+/g, " ")
      .replace(/--/g, "–")
      .replace(/(?<!\\)\$/g, "")
      .replace(/\\\$/g, "$")
      .replace(/\\%/g, "%")
      .replace(/\\theta/, "θ")
      .replace(/\\Theta/, "Θ")
      .replace(/\\omega/, "ω")
      .replace(/\\Omega/, "Ω")
      .replace(/\\varepsilon/, "ε")
      .replace(/\\Epsilon/, "Ε")
      .replace(/\\epsilon/, "ϵ")
      .replace(/\\rho/, "ρ")
      .replace(/\\Rho/, "Ρ")
      .replace(/\\tau/, "τ")
      .replace(/\\Tau/, "Τ")
      .replace(/\\psi/, "ψ")
      .replace(/\\Psi/, "Ψ")
      .replace(/\\upsilon/, "υ")
      .replace(/\\Upsilon/, "Υ")
      .replace(/\\iota/, "ι")
      .replace(/\\Iota/, "Ι")
      .replace(/\\omicron/, "ο")
      .replace(/\\Omicron/, "Ο")
      .replace(/\\pi/, "π")
      .replace(/\\Pi/, "Π")
      .replace(/\\alpha/, "α")
      .replace(/\\Alpha/, "Α")
      .replace(/\\sigma/, "σ")
      .replace(/\\Sigma/, "Σ")
      .replace(/\\delta/, "δ")
      .replace(/\\Delta/, "Δ")
      .replace(/\\varphi/, "φ")
      .replace(/\\theta/, "ϑ")
      .replace(/\\gamma/, "γ")
      .replace(/\\Gamma/, "Γ")
      .replace(/\\eta/, "η")
      .replace(/\\Eta/, "Η")
      .replace(/\\phi/, "ϕ")
      .replace(/\\Phi/, "Φ")
      .replace(/\\kappa/, "κ")
      .replace(/\\Kappa/, "Κ")
      .replace(/\\lambda/, "λ")
      .replace(/\\Lambda/, "Λ")
      .replace(/\\zeta/, "ζ")
      .replace(/\\Zeta/, "Ζ")
      .replace(/\\xi/, "ξ")
      .replace(/\\Xi/, "Ξ")
      .replace(/\\chi/, "χ")
      .replace(/\\Chi/, "Χ")
      .replace(/\\beta/, "β")
      .replace(/\\Beta/, "Β")
      .replace(/\\nu/, "ν")
      .replace(/\\Nu/, "Ν")
      .replace(/\\mu/, "μ")
      .replace(/\\Mu/, "Μ");
  }
};
