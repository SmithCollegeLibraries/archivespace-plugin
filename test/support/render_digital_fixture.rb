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
    { record: record, dig_objs: dig_objs, has_children: false }
  end

  def record
    @record ||= (@options['record_type'] == 'ArchivalObject' ? ArchivalObject : DigitalObject).new.merge(
      'json' => { 'representative_file_version' => @options['representative'] }
    )
  end

  def dig_objs; @options.fetch('files', []); end
  def t(key, **options); key; end
  def strip_mixed_content(value); ERB::Util.html_escape(value); end
  def representative_link_to_digital_materials?(record); false; end

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
    render(partial: 'shared/digital')
  end
end

puts DigitalFixture.new(JSON.parse(STDIN.read)).html if $PROGRAM_NAME == __FILE__
