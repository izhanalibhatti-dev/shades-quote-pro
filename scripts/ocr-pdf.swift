import AppKit
import Foundation
import PDFKit
import Vision

guard CommandLine.arguments.count >= 3 else {
  fputs("Usage: swift scripts/ocr-pdf.swift <input.pdf> <output-dir>\n", stderr)
  exit(1)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)

guard let document = PDFDocument(url: inputURL) else {
  fputs("Could not open PDF: \(inputURL.path)\n", stderr)
  exit(1)
}

try FileManager.default.createDirectory(at: outputURL, withIntermediateDirectories: true)

func render(page: PDFPage, scale: CGFloat = 3.0) -> CGImage? {
  let bounds = page.bounds(for: .mediaBox)
  let width = Int(bounds.width * scale)
  let height = Int(bounds.height * scale)
  guard let context = CGContext(
    data: nil,
    width: width,
    height: height,
    bitsPerComponent: 8,
    bytesPerRow: 0,
    space: CGColorSpaceCreateDeviceRGB(),
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
  ) else {
    return nil
  }

  context.setFillColor(NSColor.white.cgColor)
  context.fill(CGRect(x: 0, y: 0, width: width, height: height))
  context.saveGState()
  context.scaleBy(x: scale, y: scale)
  page.draw(with: .mediaBox, to: context)
  context.restoreGState()
  return context.makeImage()
}

for pageIndex in 0..<document.pageCount {
  guard let page = document.page(at: pageIndex), let image = render(page: page) else {
    continue
  }

  let request = VNRecognizeTextRequest()
  request.recognitionLevel = .accurate
  request.usesLanguageCorrection = false
  request.minimumTextHeight = 0.003

  let handler = VNImageRequestHandler(cgImage: image, options: [:])
  try handler.perform([request])

  let observations = request.results ?? []
  let rows = observations.compactMap { observation -> (text: String, x: Double, y: Double, w: Double, h: Double, confidence: Float)? in
    guard let candidate = observation.topCandidates(1).first else {
      return nil
    }
    return (
      candidate.string,
      Double(observation.boundingBox.origin.x),
      Double(observation.boundingBox.origin.y),
      Double(observation.boundingBox.width),
      Double(observation.boundingBox.height),
      candidate.confidence
    )
  }
  .sorted {
    if abs($0.y - $1.y) > 0.008 {
      return $0.y > $1.y
    }
    return $0.x < $1.x
  }

  var output = "page\ty\tx\tw\th\tconfidence\ttext\n"
  for row in rows {
    output += String(
      format: "%d\t%.5f\t%.5f\t%.5f\t%.5f\t%.3f\t%@\n",
      pageIndex + 1,
      row.y,
      row.x,
      row.w,
      row.h,
      row.confidence,
      row.text,
    )
  }

  let pageURL = outputURL.appendingPathComponent(String(format: "page-%03d.tsv", pageIndex + 1))
  try output.write(to: pageURL, atomically: true, encoding: .utf8)
  print("page=\(pageIndex + 1) rows=\(rows.count)")
}
