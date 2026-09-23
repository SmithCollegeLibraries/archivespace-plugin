require 'erb'
require 'minitest/autorun'

# Render the actual partial with only its documented local; no Rails required.
class FallbackTemplateTest < Minitest::Test
  TEMPLATE = File.expand_path('../public/views/shared/_digital_viewer_fallback.html.erb', __dir__)

  def render_fallback(uri)
    ERB.new(File.read(TEMPLATE)).result(binding)
  end

  def test_enabled_javascript_has_no_viewer_instructions
    ['https://example.test/manifests/book.json', 'https://example.test/photo.jpg',
     'https://compass.fivecolleges.edu/object/smith:1348191'].each do |uri|
      html = render_fallback(uri)
      visible = html.gsub(/<noscript>.*?<\/noscript>/m, '')
      refute_match(/JavaScript|blocked|viewer is unavailable|viewing data/, visible)
      assert_includes visible, 'Open original link'
      assert_match(/<noscript>.*Please enable JavaScript.*<\/noscript>/m, html)
    end
  end

  def test_unlinked_identifier_has_no_empty_paragraph
    html = render_fallback('smith:1348191')
    refute_match(/<p>\s*<\/p>/, html)
    assert_includes html, 'Please enable JavaScript'
  end

  def test_pdf_has_server_rendered_access_instructions
    html = render_fallback('https://example.test/paper.PDF?download=1')
    assert_includes html, 'original PDF link'
    assert_includes html, '<noscript>'
    assert_includes html, 'Please enable JavaScript in your browser and reload this page'
    refute_match(/<script\b/, html)
  end

  def test_image_has_server_rendered_access_instructions
    html = render_fallback('https://example.test/photo.jpg')
    assert_includes html, 'original image link'
  end

  def test_manifest_only_has_enable_javascript_message_without_promising_readable_content
    html = render_fallback('https://example.test/manifests/sequence.json')
    assert_includes html, 'Please enable JavaScript in your browser and reload this page'
    assert_includes html, 'viewing data'
    refute_includes html, 'open the file directly'
    refute_includes html, 'scripts are blocked'
  end

  def test_thumbnail_without_destination_does_not_promise_a_link
    assert_empty render_fallback(nil).strip
    assert_empty render_fallback('').strip
  end

  def test_record_navigation_is_not_described_as_a_viewer_source
    assert_empty render_fallback('/repositories/2/digital_objects/871').strip
  end

  def test_text_link_survives_a_missing_thumbnail_and_escapes_its_destination
    html = render_fallback('https://example.test/photo.jpg?a=1&b=2')
    assert_includes html, 'class="dv-original-link"'
    assert_includes html, '>Open original link</a>'
    assert_includes html, 'href="https://example.test/photo.jpg?a=1&amp;b=2"'
  end

  def test_unsafe_schemes_do_not_get_a_new_link
    html = render_fallback('javascript:alert(1)')
    refute_includes html, '<a '
    refute_includes html, 'link above'
  end
end

require_relative 'support/render_digital_fixture'

class DigitalFallbackIntegrationTest < Minitest::Test
  def test_entry_and_thumbnail_branches_include_access_help
    [nil, 'https://example.test/preview.jpg'].each do |thumbnail|
      html = DigitalFixture.new('files' => [{ 'out' => 'https://example.test/document.pdf', 'thumb' => thumbnail,
        'caption' => 'Document', 'material' => '(text)' }]).html
      assert_includes html, 'original PDF link'
      assert_includes html, 'href="https://example.test/document.pdf"'
    end
  end

  def test_representative_branch_includes_access_help
    html = DigitalFixture.new('representative' => { 'file_uri' => 'https://example.test/preview.jpg',
      'derived_from' => 'https://example.test/document.pdf' }).html
    assert_includes html, 'original PDF link'
  end
end

class AdditionalFallbackTest < Minitest::Test
  def test_additional_file_versions_retain_labels_links_and_fallback
    path = File.expand_path('../public/views/digital_objects/_additional_file_versions.html.erb', __dir__)
    html = File.exist?(path) ? DigitalFixture.new('additional' => true, 'files' => [
      { 'file_uri' => 'https://example.test/manifests/book.json', 'caption' => '<script>bad()</script>' }
    ]).html : ''
    assert_includes html, 'Please enable JavaScript'
    assert_includes html, 'data-additional-file-version'
    assert_includes html, 'href="https://example.test/manifests/book.json"'
    refute_includes html, '<script>bad()'
    assert_includes html, '&lt;script&gt;'
  end

  def test_collection_browse_does_not_promise_an_embedded_viewer
    html = DigitalFixture.new('browse' => true, 'representative' => {
      'file_uri' => 'https://example.test/preview.jpg', 'derived_from' => 'https://example.test/collection'
    }).html
    refute_includes html, 'dv-access-help'
  end
end

class SourceAttributeContractTest < Minitest::Test
  def test_entry_and_thumbnail_link_supply_explicit_source
    [nil, 'https://example.test/thumb.jpg'].each do |thumb|
      html = DigitalFixture.new('files' => [{ 'out' => 'https://example.test/image.jpg?a=1&b=2', 'thumb' => thumb }]).html
      assert_includes html, 'data-dv-source-expected="true"'
      assert_includes html, 'data-file-uri="https://example.test/image.jpg?a=1&amp;b=2"'
      assert_includes html, 'data-dv-source-group="digital-object-entries"'
    end
  end

  def test_representative_source_survives_stock_partial_wrapping
    html = DigitalFixture.new('representative' => { 'file_uri' => 'https://example.test/thumb.jpg',
      'derived_from' => 'https://example.test/manifests/book.json' }).html
    assert_includes html, 'data-dv-source-expected="true"'
    assert_includes html, 'data-file-uri="https://example.test/manifests/book.json"'
  end

  def test_browse_and_thumbnail_only_are_not_source_producers
    browse = DigitalFixture.new('browse' => true, 'representative' => { 'file_uri' => 'https://example.test/thumb.jpg',
      'derived_from' => 'https://example.test/manifests/book.json' }).html
    assert_includes browse, 'data-dv-browse-only="true"'
    refute_includes browse, 'data-file-uri='
    thumb = DigitalFixture.new('files' => [{ 'thumb' => 'https://example.test/thumb.jpg' }]).html
    refute_includes thumb, 'data-file-uri='
  end

  def test_additional_versions_supply_explicit_source
    html = DigitalFixture.new('additional' => true, 'files' => [{ 'file_uri' => 'https://example.test/document.pdf' }]).html
    assert_includes html, 'data-dv-source-expected="true"'
    assert_includes html, 'data-file-uri="https://example.test/document.pdf"'
  end
end
