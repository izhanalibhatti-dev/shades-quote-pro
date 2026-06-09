import Foundation
import PDFKit

guard CommandLine.arguments.count >= 3 else {
  fputs("Usage: swift scripts/extract-pdf-text.swift <input.pdf> <output-dir>\n", stderr)
  exit(1)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)

guard let document = PDFDocument(url: inputURL) else {
  fputs("Could not open PDF: \(inputURL.path)\n", stderr)
  exit(1)
}

try FileManager.default.createDirectory(at: outputURL, withIntermediateDirectories: true)

var combined = ""

for index in 0..<document.pageCount {
  guard let page = document.page(at: index) else { continue }
  let pageNumber = index + 1
  let text = page.string ?? ""
  let header = "\n\n===== PAGE \(pageNumber) =====\n\n"
  combined += header + text
  try text.write(
    to: outputURL.appendingPathComponent(String(format: "page-%03d.txt", pageNumber)),
    atomically: true,
    encoding: .utf8,
  )
}

try combined.write(
  to: outputURL.appendingPathComponent("combined.txt"),
  atomically: true,
  encoding: .utf8,
)

print("pages=\(document.pageCount)")
