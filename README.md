# SMART JSON -> RDF Toolkit
For generating nice idiomatic JSON that can be converted to SMART RDF...

Experimental tool to highlight a migration path towards easier-to-understand payloads.

### Proxy mode
Sits in front of a JSON-serving container and converts to RDF on-the-fly.

### Converter mode
Explicit POST to `/convert` to convert on-demand

### Browser mode
`sample_container/convert.js` is a browserify'd version that runs client-side

---
To re-generate `convert.js`:

```
npm install -g browserify
browserify -s convert -e  ./lib/convert.js   > sample_container/convert.js
```
