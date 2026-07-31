# ProvenanceWidgets

[![DOI:10.1109/TVCG.2024.3456144](https://zenodo.org/badge/DOI/10.1109/TVCG.2024.3456144.svg)](https://doi.org/10.1109/TVCG.2024.3456144)
[![arxiv badge](https://img.shields.io/badge/arXiv-2407.17431-red)](https://arxiv.org/abs/2407.17431)
[![NPM - Downloads](https://img.shields.io/npm/dm/provenance-widgets)](https://www.npmjs.com/package/provenance-widgets)

A JavaScript library of GUI Controls for Tracking and Dynamically Overlaying Analytic Provenance.

### Read and cite our paper, to appear in 2024 IEEE VIS Conference
```bibTeX
@article{narechania2024provenancewidgets,
  title = {{ProvenanceWidgets}: {A Library of UI Control Elements to Track and Dynamically Overlay Analytic Provenance}},
  shorttitle = {{ProvenanceWidgets}},
  author = {{Narechania}, Arpit and {Odak}, Kaustubh and {El-Assady}, Mennatallah and {Endert}, Alex},
  journal = {IEEE Transactions on Visualization and Computer Graphics (TVCG)},
  doi = {10.1109/TVCG.2024.3456144},
  url = {https://doi.org/10.1109/TVCG.2024.3456144},
  year = {2024},
  publisher = {IEEE}
}
```

<div align="center">
  <a href="http://www.replicabilitystamp.org#https-github-com-provenancewidgets-provenancewidgets-github-io">
   <img src="https://www.replicabilitystamp.org/logo/Reproducibility-small.png">
  </a>
</div>
<p align="center">
  GRSI-approved replicable project
</p>


## Documentation

Visit https://provenancewidgets.github.io/ to view the full documentation and demos.

### Web Components

The package includes browser-ready custom elements for vanilla HTML and
non-React applications:

```html
<link
  rel="stylesheet"
  href="/node_modules/provenance-widgets/web-components/styles.css"
>
<script
  src="/node_modules/provenance-widgets/web-components/index.js"
></script>

<web-provenance-slider
  id="price"
  value="45"
  min="0"
  max="100"
  data-label="Price"
></web-provenance-slider>
```

Assign arrays and objects as JavaScript properties and read changes from
`CustomEvent.detail`. See [the Web Components guide](docs/WEB_COMPONENTS.md)
and [the runnable vanilla example](examples/web-components/index.html).

## Contact
If you have any questions, feel free to [open an issue](https://github.com/ProvenanceWidgets/ProvenanceWidgets/issues/new/choose) or contact [Arpit Narechania](https://narechania.com).
