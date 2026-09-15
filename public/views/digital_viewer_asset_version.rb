require 'digest'

module DigitalViewerAssetVersion
  SERVED_ASSETS = [
    'digital_viewer.js',
    'digital_viewer.css',
    'openseadragon.min.js',
  ].freeze

  module_function

  def for_plugin_root(plugin_root)
    digest = Digest::SHA256.new

    SERVED_ASSETS.each do |filename|
      path = File.join(plugin_root, 'public', 'assets', filename)
      digest << filename << "\0" << File.binread(path) << "\0"
    end

    digest.hexdigest
  end
end
