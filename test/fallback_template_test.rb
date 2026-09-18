require 'erb'
require 'minitest/autorun'

# Render the actual partial with only its documented local; no Rails required.
class FallbackTemplateTest < Minitest::Test
  TEMPLATE = File.expand_path('../public/views/shared/_digital_viewer_fallback.html.erb', __dir__)

  def render_fallback(uri)
    ERB.new(File.read(TEMPLATE)).result(binding)
  end

  def test_pdf_has_server_rendered_access_instructions
    html = render_fallback('https://example.test/paper.PDF?download=1')
    assert_includes html, 'original PDF link'
    assert_includes html, '<noscript>'
    refute_match(/<script\b/, html)
  end

  def test_image_has_server_rendered_access_instructions
    html = render_fallback('https://example.test/photo.jpg')
    assert_includes html, 'original image link'
  end

  def test_thumbnail_without_destination_does_not_promise_a_link
    assert_empty render_fallback(nil).strip
    assert_empty render_fallback('').strip
  end

  def test_source_urls_are_not_copied_into_instructions
    html = render_fallback('https://example.test/photo.jpg?token=private')
    assert_includes html, 'original image link'
    refute_includes html, 'private'
    refute_includes html, '<a '
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
