const { CompositeDisposable } = require('atom')
const BibList = require('./bib-list')

/**
 * BibTeX Finder Package
 * Provides quick access to configured BibTeX bibliography files.
 * Supports up to 5 predefined bibliography source paths.
 */
module.exports = {

  /**
   * Activates the package and registers commands for opening bibliography files.
   */
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

  /**
   * Deactivates the package and disposes resources.
   */
  deactivate () {
    this.disposables.dispose()
    this.bibList.destroy()
  },

  /**
   * Opens a bibliography file by its configured slot number.
   * @param {number} id - The bibliography slot number (1-5)
   */
  openBibFile(id) {
    let filePath = atom.config.get(`bib-finder.bibPaths.path${id}`)
    if (filePath) {
      atom.workspace.open(filePath)
    } else {
      atom.notifications.addError(`The path of BibTeX-${id} has not been set`)
    }
  },

  /**
   * Consumes the file-icons service for icon display.
   * @param {Object} object - The file-icons service object
   */
  consumeClassIcons(object) {
    this.getIconClass = object.iconClassForPath;
  },
}
