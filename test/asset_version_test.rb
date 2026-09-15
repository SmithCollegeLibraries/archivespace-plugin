require 'digest'
require 'fileutils'
require 'tmpdir'
require_relative '../public/views/digital_viewer_asset_version'

def write_assets(root, contents)
  assets = File.join(root, 'public', 'assets')
  FileUtils.mkdir_p(assets)
  contents.each do |filename, content|
    File.binwrite(File.join(assets, filename), content)
  end
end

Dir.mktmpdir('digital-viewer-assets') do |root|
  original = {
    'digital_viewer.js' => 'same javascript',
    'digital_viewer.css' => 'same css',
    'openseadragon.min.js' => 'same osd',
  }
  write_assets(root, original)
  first_version = DigitalViewerAssetVersion.for_plugin_root(root)

  original.each_key do |filename|
    path = File.join(root, 'public', 'assets', filename)
    File.utime(Time.at(100), Time.at(100), path)
  end

  File.binwrite(File.join(root, 'public', 'assets', 'digital_viewer.js'), 'changed javascript')
  File.utime(Time.at(100), Time.at(100), File.join(root, 'public', 'assets', 'digital_viewer.js'))
  second_version = DigitalViewerAssetVersion.for_plugin_root(root)
  raise 'JavaScript content change did not change the version' if first_version == second_version

  copied_root = Dir.mktmpdir('digital-viewer-assets-copy')
  begin
    write_assets(copied_root, {
      'digital_viewer.js' => 'changed javascript',
      'digital_viewer.css' => 'same css',
      'openseadragon.min.js' => 'same osd',
    })
    File.utime(Time.at(999), Time.at(999), File.join(copied_root, 'public', 'assets', 'digital_viewer.js'))
    copied_version = DigitalViewerAssetVersion.for_plugin_root(copied_root)
    raise 'Copied content with different mtimes changed the version' unless copied_version == second_version
  ensure
    FileUtils.remove_entry(copied_root)
  end
end

puts 'asset version checks passed'
