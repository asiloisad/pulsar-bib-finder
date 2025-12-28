# bib-finder

Search and insert BibTeX citation keys from your bibliography files. Supports multiple `.bib` files with fuzzy search and works in any file scope.

![demo](https://github.com/asiloisad/pulsar-bib-finder/blob/master/assets/demo.gif?raw=true)

## Features

- **Fuzzy search**: Quickly find entries by author, title, or key.
- **Multiple files**: Use global or project-local `.bib` files.
- **Flexible insertion**: Insert bare keys, `\cite{}`, or `\cite[]{}` formats.
- **Type filtering**: Search by entry type with `@` or by key with `#`.

## Installation

To install `bib-finder` search for [bib-finder](https://web.pulsar-edit.dev/packages/bib-finder) in the Install pane of the Pulsar settings or run `ppm install bib-finder`. Alternatively, you can run `ppm install asiloisad/pulsar-bib-finder` to install a package directly from the GitHub repository.

## Usage

To use the package, you need a bibliography file in BibTeX format `.bib`. This file should be created and maintained by the user. There are two ways to use it:

- global: You can specify the file paths in the package settings,
- local: You can use files in project directory.

## Commands

Commands available in `atom-workspace`:

- `bib-finder:cite`: (`F9`) open citation list,
- `bib-finder:cite-from-local`: open citation list from local `.bib` files only,
- `bib-finder:cite-from-source-N`: open citation list from specific source,
- `bib-finder:open-source-1`: (`Ctrl+F9`) open source no. 1 bib file,
- `bib-finder:open-source-N`: open source bib file.

Commands available in `.bib-finder`:

- `select-list:name`: (`Enter`) insert `<key>`,
- `select-list:cite`: (`Alt+Enter`) insert `\cite{<key>}`,
- `select-list:square`: (`Ctrl+Enter`) insert `\cite[]{<key>}`,
- `select-list:update`: (`F5`) manually update list.

## Example of `.bib` file

Here's an example of the content in a bibliography file:

```bib
@book{fhck07,
  author = "Hartmann, Friedel and Katz, Casimir",
  title = "Structural Analysis with Finite Elements",
  publisher = "Springer-Verlag Berlin Heidelberg",
  address = "Germany",
  year = "2007",
  ISBN = "10-3-540-49698",
}

@book{stng51,
  author = "S. Timoshenko and J. N. Goodier",
  title = "Theory of elasticity",
  publisher = "{McGRAW-HILL BOOK Company Inc.}",
  address = "New York, Toronto, London",
  year = "1951",
}
```

## Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub — any feedback's welcome!
