import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions } from './_shared/cors.js';
import { handleError } from './_shared/error-handler.js';
import { blobStorage } from './_shared/blob-storage.js';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

// Helper function to parse markdown-like content to DOCX paragraphs
function parseMarkdownToDocx(content: string): Paragraph[] {
  const lines = content.split('\n');
  const paragraphs: Paragraph[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      // Empty line
      paragraphs.push(new Paragraph({ text: "" }));
      continue;
    }

    // Handle headings
    if (line.startsWith('# ')) {
      paragraphs.push(new Paragraph({
        text: line.substring(2),
        heading: HeadingLevel.HEADING_1,
        style: "normalParagraph",
      }));
    } else if (line.startsWith('## ')) {
      paragraphs.push(new Paragraph({
        text: line.substring(3),
        heading: HeadingLevel.HEADING_2,
        style: "normalParagraph",
      }));
    } else if (line.startsWith('### ')) {
      paragraphs.push(new Paragraph({
        text: line.substring(4),
        heading: HeadingLevel.HEADING_3,
        style: "normalParagraph",
      }));
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      // Handle bullet points
      paragraphs.push(new Paragraph({
        text: line.substring(2),
        bullet: {
          level: 0,
        },
        style: "normalParagraph",
      }));
    } else if (line.startsWith('---')) {
      // Handle horizontal rules (separators)
      paragraphs.push(new Paragraph({
        text: "",
        border: {
          bottom: {
            color: "auto",
            size: 1,
            style: "single",
          },
        },
      }));
    } else {
      // Regular paragraph
      paragraphs.push(new Paragraph({
        text: line,
        style: "normalParagraph",
      }));
    }
  }

  return paragraphs;
}

// PDF Export Function
async function generatePDF(req: VercelRequest): Promise<{ buffer: Buffer; filename: string }> {
  const { flashcards, analysisData, step } = req.body;

  // For now, create a simple PDF content string
  let pdfContent = '';

  if (step === 1 && analysisData) {
    // Export analyzed results for Step 1
    pdfContent = `# Analysis Results\n\n`;
    pdfContent += `**Detected Level:** ${analysisData.detectedLevel || 'N/A'}\n`;
    pdfContent += `**Age Appropriate:** ${analysisData.ageAppropriate || 'N/A'}\n`;
    pdfContent += `**Main Theme:** ${analysisData.mainTheme || 'N/A'}\n\n`;

    if (analysisData.vocabulary && analysisData.vocabulary.length > 0) {
      pdfContent += `**Vocabulary:**\n`;
      analysisData.vocabulary.forEach((word: string) => {
        pdfContent += `- ${word}\n`;
      });
      pdfContent += '\n';
    }

    if (analysisData.activities && analysisData.activities.length > 0) {
      pdfContent += `**Learning Activities:**\n`;
      analysisData.activities.forEach((activity: string) => {
        pdfContent += `- ${activity}\n`;
      });
    }
  } else if (flashcards && flashcards.length > 0) {
    // Export flashcards for Step 3
    pdfContent = `# Flashcards\n\n`;
    flashcards.forEach((card: any, index: number) => {
      pdfContent += `**Card ${index + 1}: ${card.word}**\n`;
      pdfContent += `Pinyin: ${card.pinyin || 'N/A'}\n`;
      pdfContent += `Translation: ${card.translation || 'N/A'}\n`;
      pdfContent += `Example: ${card.example || 'N/A'}\n`;
      if (card.imageUrl) {
        pdfContent += `Image: ${card.imageUrl}\n`;
      }
      pdfContent += '\n---\n\n';
    });
  } else {
    pdfContent = '# Export Content\n\nNo content available for export.';
  }

  // Create a simple PDF-like response (for now, just return as text)
  const timestamp = Date.now();
  const filename = step === 1 ? `analysis_${timestamp}.pdf` : `flashcards_${timestamp}.pdf`;

  // For now, return the content as a text file with PDF extension
  const buffer = Buffer.from(pdfContent, 'utf-8');

  return { buffer, filename };
}

// DOCX Export Function
async function generateDOCX(req: VercelRequest): Promise<{ buffer: Buffer; filename: string }> {
  const { content, flashcards, title } = req.body;

  try {
    let paragraphs: Paragraph[] = [];

    if (content) {
      // Parse markdown-like content
      paragraphs = parseMarkdownToDocx(content);
    } else if (flashcards && flashcards.length > 0) {
      // Handle flashcard export
      if (title) {
        paragraphs.push(new Paragraph({
          text: title,
          heading: HeadingLevel.HEADING_1,
          style: "normalParagraph",
        }));
      }

      flashcards.forEach((card: any, index: number) => {
        // Card title
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: `${index + 1}. ${card.word || ''}`,
              bold: true,
              size: 28,
            }),
          ],
          spacing: { after: 200 },
        }));

        // Card content
        if (card.pinyin) {
          paragraphs.push(new Paragraph({
            children: [
              new TextRun({
                text: `Pinyin: ${card.pinyin}`,
                italics: true,
              }),
            ],
          }));
        }

        if (card.translation) {
          paragraphs.push(new Paragraph({
            children: [
              new TextRun({
                text: `Translation: ${card.translation}`,
              }),
            ],
          }));
        }

        if (card.example) {
          paragraphs.push(new Paragraph({
            children: [
              new TextRun({
                text: `Example: ${card.example}`,
                italics: true,
              }),
            ],
          }));
        }

        // Add separator between cards
        if (index < flashcards.length - 1) {
          paragraphs.push(new Paragraph({
            text: "",
            border: {
              bottom: {
                color: "auto",
                size: 1,
                style: "single",
              },
            },
            spacing: { after: 400 },
          }));
        }
      });
    } else {
      paragraphs.push(new Paragraph({
        text: 'No content available for export.',
      }));
    }

    // Create document
    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs,
      }],
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);
    const timestamp = Date.now();
    const filename = `export_${timestamp}.docx`;

    return { buffer, filename };
  } catch (error) {
    console.error('Error generating DOCX:', error);
    throw new Error('Failed to generate DOCX file');
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { format } = req.query;

    if (!format || typeof format !== 'string') {
      return res.status(400).json({ message: 'Format parameter is required' });
    }

    let result: { buffer: Buffer; filename: string };

    switch (format.toLowerCase()) {
      case 'pdf':
        result = await generatePDF(req);
        res.setHeader('Content-Type', 'application/pdf');
        break;
      case 'docx':
        result = await generateDOCX(req);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        break;
      default:
        return res.status(400).json({ message: 'Unsupported format. Use pdf or docx' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.buffer.length);

    return res.send(result.buffer);
  } catch (error: any) {
    return handleError(res, error, 'Export API');
  }
}