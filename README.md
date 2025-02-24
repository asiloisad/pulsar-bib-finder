# bib-finder

Find bibliographic keys from your data in list form. A package supports multiple `.bib` files, utilizes fuzzy-finder for searching entries and can be used in any scope.

![demo](https://github.com/asiloisad/bib-finder/blob/master/assets/demo.gif?raw=true)

## Installation

To install `bib-finder` search for [bib-finder](https://web.pulsar-edit.dev/packages/bib-finder) in the Install pane of the Pulsar settings or run `ppm install bib-finder`. Alternatively, you can run `ppm install asiloisad/pulsar-bib-finder` to install a package directly from the GitHub repository.

## Usage

To use the package, you need a bibliography file in BibTeX format `.bib`. This file should be created and maintained by the user. There are two ways to use it:

- global: You can specify the file path in the package settings.
- local: You can copy the file to the project directory and enable the `bib-finder.bibLocal` flag.

In `bib-list` there are available shortcuts:

- `Enter`: insert `<key>`
- `Alt-Enter`: insert `\cite{<key>}`
- `Ctrl-Enter`: insert `\cite[]{<key>}`
- `F5`: manually update list.

You can use the special character `@` for searching by type or `#` for searching by key.

## Example of `.bib` file

Here's an example of the content in a bibliography file:

```bib
@book{fhck07,
  author    = "Hartmann, Friedel and Katz, Casimir",
  title     = "Structural Analysis with Finite Elements",
  publisher = "Springer-Verlag Berlin Heidelberg",
  address   = "Germany",
  year      = "2007",
  ISBN      = "10-3-540-49698",
}

@book{stng51,
  author    = "S. Timoshenko and J. N. Goodier",
  title     = "Theory of elasticity",
  publisher = "{McGRAW-HILL BOOK Company Inc.}",
  address   = "New York, Toronto, London",
  year      = "1951",
}
```

# Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub — any feedback’s welcome!
