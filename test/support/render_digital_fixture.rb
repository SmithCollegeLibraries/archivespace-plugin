# Minimal Rails helper substitutes for deterministic template/browser fixtures.
# This renders the real plugin ERB, but is not real-ASpace rendering evidence.
require 'erb'
require 'json'

class Object
  def blank?; !self || (respond_to?(:empty?) && empty?); end
  def present?; !blank?; end
end
class String
  def html_safe; self; end
end
class DigitalObject < Hash; end
class ArchivalObject < Hash; end

class DigitalFixture
  def initialize(options)
    @options = options
  end

  def local_assigns
    { record: record, dig_objs: dig_objs, has_children: !!@options['has_children'] }
  end

  def record
    @record ||= (@options['record_type'] == 'ArchivalObject' ? ArchivalObject : DigitalObject).new.merge(
      'json' => { 'representative_file_version' => @options['representative'] }
    )
  end

  def dig_objs; @options.fetch('files', []); end
  def t(key, **options); key; end
  def strip_mixed_content(value); ERB::Util.html_escape(value); end
  def representative_link_to_digital_materials?(record); !!@options['browse']; end
  def n_digital_objects; 3; end
  def params; { rid: 2, id: 3 }; end
  def app_prefix(path); path; end
  def fvs; @options.fetch('files', []); end
  def link_to(label, uri, **options)
    attributes = options.map do |key, value|
      if key == :data
        value.map { |name, content| ' data-' + name.to_s + '="' + ERB::Util.html_escape(content.to_s) + '"' }.join
      else
        ' ' + key.to_s + '="' + ERB::Util.html_escape(value.to_s) + '"'
      end
    end.join
    '<a href="' + ERB::Util.html_escape(uri.to_s) + '"' + attributes + '>' + ERB::Util.html_escape(label.to_s) + '</a>'
  end

  def render(partial:, locals: {})
    if partial == 'shared/representative_file_version_record'
      # ArchivesSpace owns this partial. Model its documented wrapper only.
      return '<div data-rep-file-version-wrapper><a href="' + ERB::Util.html_escape(locals[:a_uri]) +
        '"><img alt="Preview" src="' + ERB::Util.html_escape(locals[:img_uri]) + '"></a></div>'
    end
    scope = binding
    locals.each { |name, value| scope.local_variable_set(name, value) }
    path = File.expand_path('../../public/views/' + partial.sub(/([^\/]+)\z/, '_\1') + '.html.erb', __dir__)
    ERB.new(File.read(path)).result(scope)
  end

  def html
    render(partial: @options['additional'] ? 'digital_objects/additional_file_versions' : 'shared/digital')
  end
end

puts DigitalFixture.new(JSON.parse(STDIN.read)).html if $PROGRAM_NAME == __FILE__
