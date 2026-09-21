require 'digest'
require 'thread'

module DigitalViewerAssetVersion
  SERVED_ASSETS = [
    'digital_viewer.js',
    'digital_viewer.css',
    'openseadragon.min.js',
  ].freeze

  VERSIONS = {}
  VERSION_LOCK = Mutex.new

  module_function

  def for_plugin_root(plugin_root)
    # Deployments and local asset edits require an ASpace restart.
    root = File.expand_path(plugin_root)
    VERSION_LOCK.synchronize do
      VERSIONS[root] ||= compute_version(root)
    end
  end

  def compute_version(plugin_root)
    digest = Digest::SHA256.new

    SERVED_ASSETS.each do |filename|
      path = File.join(plugin_root, 'public', 'assets', filename)
      digest << filename << "\0" << File.binread(path) << "\0"
    end

    digest.hexdigest
  rescue SystemCallError, IOError
    # A broken plugin asset must not prevent the surrounding PUI page rendering.
    warn '[digital_viewer] stage=assets code=asset-unavailable'
    'unavailable'
  end
  private_class_method :compute_version
end
