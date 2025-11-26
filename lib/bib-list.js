/** @babel */
/** @jsx etch.dom */

const etch = require('etch')
const { CompositeDisposable } = require('atom')
const SelectListView = require('atom-select-list')
const fs = require('fs')
const path = require('path')
const { globSync } = require('glob')
const bibtexParse = require('bibtex-parse')
const Diacritics = require('diacritic')

module.exports = class BibList {

  constructor (S) {
    this.S = S
    this.items = null
    this.query = ''

    this.slv = new SelectListView({
      items: [],
      maxResults: 50,
      emptyMessage: <div class='empty-message'>No matches found</div>,
      elementForItem: (item, options) => {
        let li = document.createElement('li')
        if (!options.visible) { return li }
        let matches = this.query.length > 0 ? atom.ui.fuzzyMatcher.match(item.text, this.query, { recordMatchIndexes:true }).matchIndexes : []
        li.classList.add('two-lines')
        let priBlock = document.createElement('div')
        priBlock.classList.add('primary-line')
        let typeBlock = document.createElement('span')
        typeBlock.classList.add('item-type')
        priBlock.appendChild(typeBlock)
        let total = 1
        this.highlightMatchesInElement(item.type, matches.map(x => x - total), typeBlock)
        total += 2 + item.type.length
        this.highlightMatchesInElement(item.key, matches.map(x => x - total), priBlock)
        total += 3 + item.key.length
        li.appendChild(priBlock)
        let secBlock = document.createElement('div')
        secBlock.classList.add('secondary-line')
        this.highlightMatchesInElement(item.description, matches.map(x => x - total), secBlock)
        li.appendChild(secBlock)
        if (this.showSource) {
          let pathBlock = document.createElement('div')
          let iconClass = this.S.getIconClass ? this.S.getIconClass(item.pPath) : ['icon-file-text']
          pathBlock.classList.add('icon', 'icon-line', ...iconClass)
          pathBlock.textContent = item.fPath
          li.appendChild(pathBlock)
        }
        li.addEventListener('contextmenu', () => { this.slv.selectIndex(options.index) })
        return li
      },
      didConfirmSelection: this.didConfirmSelection.bind(this),
      didCancelSelection: this.didCancelSelection.bind(this),
      filter: this.filter.bind(this),
      didChangeQuery: (query) => { this.query = Diacritics.clean(query) },
    })
    this.slv.element.classList.add('bib-finder')
    this.slv.element.classList.add('command-palette')
    this.disposables = new CompositeDisposable()
    this.disposables.add(
      atom.commands.add(this.slv.element, {
        'select-list:name': () => this.didConfirmSelection(null, 'name'),
        'select-list:cite': () => this.didConfirmSelection(null, 'cite'),
        'select-list:opti': () => this.didConfirmSelection(null, 'opti'),
      }),
      atom.commands.add('atom-workspace', {
        'bib-finder:cite': () => this.toggle(),
        'bib-finder:cite-from-local': () => this.toggle('local'),
        'bib-finder:cite-from-source-1': () => this.toggle(1),
        'bib-finder:cite-from-source-2': () => this.toggle(2),
        'bib-finder:cite-from-source-3': () => this.toggle(3),
        'bib-finder:cite-from-source-4': () => this.toggle(4),
        'bib-finder:cite-from-source-5': () => this.toggle(5),
        'bib-finder:update': () => this.refresh(),
      }),
      atom.config.observe('command-palette.preserveLastSearch', (value) => {
        this.preserveLastSearch = value
      }),
      atom.config.observe('bib-finder.bibLocal', (value) => {
        this.bibLocal = value ; this.items = null
      }),
      atom.config.observe('bib-finder.allowDuplicate', (value) => {
        this.allowDuplicate = value ; this.items = null
      }),
      atom.config.observe('bib-finder.reloadAlways', (value) => {
        this.reloadAlways = value
      }),
      atom.config.observe('bib-finder.showSource', (value) => {
        this.showSource = value ; this.slv.update()
      }),
      atom.config.observe('bib-finder.showKeystrokes', (value) => {
        this.showKeystrokes = value
        this.slv.update({infoMessage:this.getInfoMessage()})
      }),
      atom.config.observe('bib-finder.bibPaths.path1', (value) => {
        this.bibPath1 = value ; this.items = null
      }),
      atom.config.observe('bib-finder.bibPaths.path2', (value) => {
        this.bibPath2 = value ; this.items = null
      }),
      atom.config.observe('bib-finder.bibPaths.path3', (value) => {
        this.bibPath3 = value ; this.items = null
      }),
      atom.config.observe('bib-finder.bibPaths.path4', (value) => {
        this.bibPath4 = value ; this.items = null
      }),
      atom.config.observe('bib-finder.bibPaths.path5', (value) => {
        this.bibPath5 = value ; this.items = null
      }),
      atom.config.observe('bib-finder.bibPaths.array', (value) => {
        this.bibPathArray = value ; this.items = null
      }),
    )
  }

  destroy() {
    this.disposables.dispose()
    if (this.panel) { this.panel.destroy() }
    this.slv.destroy()
  }

  show(id) {
    if (!this.panel) {
      this.panel = atom.workspace.addModalPanel({ item: this.slv })
    }
    this.previouslyFocusedElement = document.activeElement
    this.update(id)
    if (this.preserveLastSearch) {
      this.slv.refs.queryEditor.selectAll()
    } else {
      this.slv.reset()
    }
    this.panel.show()
    this.slv.focus()
  }

  hide() {
    this.panel.hide()
    if (this.previouslyFocusedElement) {
      this.previouslyFocusedElement.focus()
      this.previouslyFocusedElement = null
    }
  }

  toggle(id) {
    if (this.panel && this.panel.isVisible()) {
      this.hide()
    } else {
      this.show(id)
    }
  }

  refresh(id) {
    this.items = null ; this.update(id)
  }

  update(id) {
    if (!this.items || this.reloadAlways || this.id !== id) {
      this.slv.update({ items:[], loadingMessage:this.getLoadingMessage(), infoMessage:null })
      this.cache(id).then(() => {
        this.slv.update({ items:this.items, loadingMessage:null, infoMessage:this.getInfoMessage() })
      })
    }
  }

  cache(id) {
    return new Promise((resolve, reject) => {
      let paths = []
      if (id === 'local' || (!id && this.bibLocal)) {
        for (let pPath of atom.project.getPaths()) {
          for (let fPath of globSync('**/*.bib', { cwd:pPath })) {
            paths.push(path.join(pPath, fPath))
          }
        }
      }
      if (id === 1 || !id) {
        if (this.bibPath1) { paths.push(this.bibPath1) }
      }
      if (id === 2 || !id) {
        if (this.bibPath2) { paths.push(this.bibPath2) }
      }
      if (id === 3 || !id) {
        if (this.bibPath3) { paths.push(this.bibPath3) }
      }
      if (id === 4 || !id) {
        if (this.bibPath4) { paths.push(this.bibPath4) }
      }
      if (id === 5 || !id) {
        if (this.bibPath5) { paths.push(this.bibPath5) }
      }
      if (!id && this.bibPathArray) {
        paths.push(...this.bibPathArray)
      }
      this.id = id ; this.items = [] ; let keys = []
      for (let fPath of paths) {
        try {
          if (!fs.existsSync(fPath)) {
            atom.notifications.addError(`The bib file ${fPath} does not exists`)
            continue
          }
          let text = fs.readFileSync(fPath, 'utf-8');
          let entries = bibtexParse.entries(text);
          for (let entry of entries) {
            if (keys.includes(entry.key)) { continue }
            let description = []
            for (let key in entry) {
              if (key === 'key' || key === 'type') { continue }
              description.push(entry[key])
            }
            description = this.formatText(description.join(' | '))
            let text = Diacritics.clean('@' + entry.type + ' #' + entry.key + ' | ' + description)
            this.items.push({key: entry.key, description:description, type:entry.type, text:text, fPath:fPath})
            if (!this.allowDuplicate) { keys.push(entry.key) }
          }
        } catch (err) {
          console.error(`bib-finder: Error parsing ${fPath}:`, err)
        }
      }
      resolve()
    })
  }

  getInfoMessage() {
    return this.showKeystrokes ? [
      'Press ',
      <span class='keystroke'>Enter</span>,
      ', ',
      <span class='keystroke'>Alt-Enter</span>,
      ' or ',
      <span class='keystroke'>Ctrl-Enter</span>
    ] : null
  }

  getLoadingMessage() {
    return [
      <span>{`Indexing project \u2026`}</span>,
      <span class='loading loading-spinner-tiny'/>
    ]
  }

  highlightMatchesInElement(text, matches, el) {
    let matchedChars = []
    let lastIndex = 0
    for (const matchIndex of matches) {
      const unmatched = text.substring(lastIndex, matchIndex)
      if (unmatched) {
        if (matchedChars.length > 0) {
          const matchSpan = document.createElement('span')
          matchSpan.classList.add('character-match')
          matchSpan.textContent = matchedChars.join('')
          el.appendChild(matchSpan)
          matchedChars = []
        }
        el.appendChild(document.createTextNode(unmatched))
      }
      matchedChars.push(text[matchIndex])
      lastIndex = matchIndex + 1
    }
    if (matchedChars.length > 0) {
      const matchSpan = document.createElement('span')
      matchSpan.classList.add('character-match')
      matchSpan.textContent = matchedChars.join('')
      el.appendChild(matchSpan)
    }
    const unmatched = text.substring(lastIndex)
    if (unmatched) {
      el.appendChild(document.createTextNode(unmatched))
    }
  }

  didConfirmSelection(item, mode) {
    if (!item) { item = this.slv.getSelectedItem() }
    if (!item) { return } else { this.hide() }
    if (!mode) { mode = 'name' }
    let editor = atom.workspace.getActiveTextEditor()
    if (!editor) { return }
    if (mode === 'name') {
      editor.insertText(item.key)
    } else if (mode === 'cite') {
      editor.insertText(`\\cite{${item.key}}`)
    } else if (mode === 'opti') {
      editor.transact(() => {
        editor.insertText(`\\cite[]{${item.key}}`)
        for (let cursor of editor.getCursors()) {
          let bufPos = cursor.getBufferPosition()
          cursor.setBufferPosition([bufPos.row, bufPos.column - item.key.length - 3])
        }
      })
    }
  }

  didCancelSelection() {
    this.hide()
  }

  formatText(text) {
    return text.trim()
      .replace(/~+/g         , ' ')
      .replace(/--/g         , '–')
      .replace(/(?<!\\)\$/g  , '' )
      .replace(/\\\$/g       , '$')
      .replace(/\\%/g        , '%')
      .replace(/\\theta/     , 'θ')
      .replace(/\\Theta/     , 'Θ')
      .replace(/\\omega/     , 'ω')
      .replace(/\\Omega/     , 'Ω')
      .replace(/\\varepsilon/, 'ε')
      .replace(/\\Epsilon/   , 'Ε')
      .replace(/\\epsilon/   , 'ϵ')
      .replace(/\\rho/       , 'ρ')
      .replace(/\\Rho/       , 'Ρ')
      .replace(/\\tau/       , 'τ')
      .replace(/\\Tau/       , 'Τ')
      .replace(/\\psi/       , 'ψ')
      .replace(/\\Psi/       , 'Ψ')
      .replace(/\\upsilon/   , 'υ')
      .replace(/\\Upsilon/   , 'Υ')
      .replace(/\\iota/      , 'ι')
      .replace(/\\Iota/      , 'Ι')
      .replace(/\\omnikron/  , 'ο')
      .replace(/\\Omikron/   , 'Ο')
      .replace(/\\pi/        , 'π')
      .replace(/\\Pi/        , 'Π')
      .replace(/\\alpha/     , 'α')
      .replace(/\\Alpha/     , 'Α')
      .replace(/\\sigma/     , 'σ')
      .replace(/\\Sigma/     , 'Σ')
      .replace(/\\delta/     , 'δ')
      .replace(/\\Delta/     , 'Δ')
      .replace(/\\varphi/    , 'φ')
      .replace(/\\theta/     , 'ϑ')
      .replace(/\\gamma/     , 'γ')
      .replace(/\\Gamma/     , 'Γ')
      .replace(/\\eta/       , 'η')
      .replace(/\\Eta/       , 'Η')
      .replace(/\\phi/       , 'ϕ')
      .replace(/\\Phi/       , 'Φ')
      .replace(/\\kappa/     , 'κ')
      .replace(/\\Kappa/     , 'Κ')
      .replace(/\\lambda/    , 'λ')
      .replace(/\\Lambda/    , 'Λ')
      .replace(/\\zeta/      , 'ζ')
      .replace(/\\Zeta/      , 'Ζ')
      .replace(/\\xi/        , 'ξ')
      .replace(/\\Xi/        , 'Ξ')
      .replace(/\\chi/       , 'χ')
      .replace(/\\Chi/       , 'Χ')
      .replace(/\\beta/      , 'β')
      .replace(/\\Beta/      , 'Β')
      .replace(/\\nu/        , 'ν')
      .replace(/\\Nu/        , 'Ν')
      .replace(/\\mu/        , 'μ')
      .replace(/\\Mu/        , 'Μ')
  }

  filter(items, query) {
    this.query = Diacritics.clean(query)
    if (this.query.length === 0) {
      return items
    }
    const scoredItems = []
    for (const item of items) {
      item.score = atom.ui.fuzzyMatcher.score(item.text, this.query)
      if (item.score > 0) { scoredItems.push(item) }
    }
    scoredItems.sort((a, b) => b.score - a.score)
    return scoredItems
  }
}
