# Legacy plugin files

These files are historical and are not inputs to the maintained public viewer.
Edit `src/` and run the build described in `../docs/plugin-build.md`; ArchivesSpace
PUI loads the generated `public/assets/digital_viewer.js` through
`public/views/layout_head.html.erb`. Do not independently patch/synchronize this
legacy copy. It remains packaged unchanged while its use across ArchivesSpace
Staff and PUI is reconciled. This directory is not the React frontend.
