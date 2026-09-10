# digital_viewer — ArchivesSpace PUI plugin
#
# Injects an OpenSeadragon IIIF viewer into archival object and digital object
# show pages when a linked digital object has a Compass S3 TIFF or a Preservica
# manifest URL.
#
# Supported sources (detected from file_uri):
#   - compass.fivecolleges.edu/system/files/  → Cantaloupe IIIF (S3 TIFF)
#   - UUID pattern in URI                     → Preservica IIIF manifest
#
# Activation: add this plugin to config/config.rb:
#   AppConfig[:plugins] = ['digital_viewer']
#
# ASpace's plugin loader evaluates this file in the context of each running
# application component (backend, frontend, public).  Keep it side-effect-free
# at the top level — use initializers or overrides for actual behaviour.
