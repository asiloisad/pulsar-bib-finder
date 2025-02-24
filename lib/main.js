const { CompositeDisposable } = require('atom')
const BibList = require('./bib-list')

module.exports = {

  activate () {
    this.disposables = new CompositeDisposable()
    this.disposables.add(atom.commands.add('atom-workspace', {
        'bib-finder:open-source-1': () => this.openBibFile(1),
        'bib-finder:open-source-2': () => this.openBibFile(2),
        'bib-finder:open-source-3': () => this.openBibFile(3),
        'bib-finder:open-source-4': () => this.openBibFile(4),
        'bib-finder:open-source-5': () => this.openBibFile(5),
      })
    )
    this.bibList = new BibList(this)
  },

  deactivate () {
    this.disposables.dispose()
    this.bibList.destroy()
  },

  openBibFile(id) {
    let filePath = atom.config.get(`bib-finder.bibPaths.path${id}`)
    if (filePath) {
      atom.workspace.open(filePath)
    } else {
      atom.notifications.addError(`The path of BibTeX-${id} has not been set`)
    }
  },

  consumeClassIcons(object) {
    this.getIconClass = object.iconClassForPath;
  },
}
