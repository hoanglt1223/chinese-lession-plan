import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from "docx";
import { jsPDF } from "jspdf";
import { CourseLesson } from "./course-processor";
import { FlashcardData } from "../../shared/schema";
import fetch from "node-fetch";

export async function createLessonPlanDocx(lesson: CourseLesson, content: string): Promise<Buffer> {
  // Simple Markdown to Docx conversion (very basic)
  // We will try to detect tables and headers from the AI output
  
  const lines = content.split('\n');
  const children: any[] = [];

  // Title
  children.push(
    new Paragraph({
      text: `Lesson Plan: ${lesson.title}`,
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({
      text: `Unit ${lesson.unitNumber} - Lesson ${lesson.lessonNumber}`,
      heading: HeadingLevel.HEADING_1,
    })
  );

  // Process content lines
  let inTable = false;
  let tableRows: TableRow[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('|') && line.endsWith('|')) {
      // Table detected
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      
      // Parse table row
      const cells = line.split('|').filter(cell => cell.trim() !== '');
      // Skip separator lines (e.g., |---|---|)
      if (line.includes('---')) continue;

      const rowCells = cells.map(cellContent => 
        new TableCell({
          children: [new Paragraph({ text: cellContent.trim() })],
          width: {
            size: 100 / cells.length,
            type: WidthType.PERCENTAGE,
          },
        })
      );

      tableRows.push(new TableRow({ children: rowCells }));
    } else {
      // If we were in a table and now we are not, push the table
      if (inTable) {
        children.push(new Table({
          rows: tableRows,
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
        }));
        inTable = false;
        tableRows = [];
      }

      if (line === '') {
        children.push(new Paragraph({ text: "" }));
        continue;
      }

      if (line.startsWith('# ')) {
        children.push(new Paragraph({
          text: line.replace('# ', ''),
          heading: HeadingLevel.HEADING_1,
        }));
      } else if (line.startsWith('## ')) {
        children.push(new Paragraph({
          text: line.replace('## ', ''),
          heading: HeadingLevel.HEADING_2,
        }));
      } else if (line.startsWith('### ')) {
        children.push(new Paragraph({
          text: line.replace('### ', ''),
          heading: HeadingLevel.HEADING_3,
        }));
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        children.push(new Paragraph({
          text: line.replace(/^[-*] /, ''),
          bullet: {
            level: 0
          }
        }));
      } else {
        // Bold text handling (**text**) - simplified
        const parts = line.split('**');
        if (parts.length > 1) {
          const textRuns = parts.map((part, index) => {
            return new TextRun({
              text: part,
              bold: index % 2 === 1, // Every odd index was inside **
            });
          });
          children.push(new Paragraph({ children: textRuns }));
        } else {
          children.push(new Paragraph({ text: line }));
        }
      }
    }
  }

  // Flush remaining table if any
  if (inTable) {
    children.push(new Table({
      rows: tableRows,
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
    }));
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children: children,
    }],
  });

  return await Packer.toBuffer(doc);
}

export async function createFlashcardPdf(flashcards: FlashcardData[]): Promise<Buffer> {
  // A4 size: 210mm x 297mm
  // We'll put 2 flashcards per page (Portrait) or 4 (Landscape)
  // Let's go with 1 large flashcard per page for clarity, or 2 per page.
  // "final-real-work" usually implies printable resources. 
  // Let's do 2 cards per page (Top/Bottom) or 4 (Grid).
  // Let's stick to 2 cards per page (Portrait) for now.

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const cardHeight = (pageHeight - (3 * margin)) / 2;
  const cardWidth = pageWidth - (2 * margin);

  for (let i = 0; i < flashcards.length; i++) {
    const card = flashcards[i];
    const isEven = i % 2 === 0;
    
    if (!isEven) {
      // Second card on page, move down
      // No new page needed yet
    } else if (i > 0) {
      doc.addPage();
    }

    const yPos = isEven ? margin : margin + cardHeight + margin;

    // Draw Card Border
    doc.rect(margin, yPos, cardWidth, cardHeight);

    // Word (Chinese)
    doc.setFontSize(60);
    doc.text(card.word, pageWidth / 2, yPos + 40, { align: 'center' });

    // Pinyin
    doc.setFontSize(24);
    doc.text(card.pinyin, pageWidth / 2, yPos + 60, { align: 'center' });

    // Image
    if (card.imageUrl) {
      try {
        const imageBuffer = await fetch(card.imageUrl).then(res => res.arrayBuffer());
        const imageBase64 = Buffer.from(imageBuffer).toString('base64');
        
        // Determine image format from URL or assume JPEG/PNG
        const format = card.imageUrl.toLowerCase().endsWith('.png') ? 'PNG' : 'JPEG';
        
        // Calculate aspect ratio to fit in center
        const imgMaxH = cardHeight - 100; // Leave space for text
        const imgMaxW = cardWidth - 40;
        
        doc.addImage(imageBase64, format, margin + 20, yPos + 70, imgMaxW, imgMaxH);
      } catch (e) {
        console.error(`Failed to load image for ${card.word}`, e);
        doc.text("[Image Error]", pageWidth / 2, yPos + 100, { align: 'center' });
      }
    }

    // Vietnamese
    doc.setFontSize(20);
    doc.text(card.vietnamese, pageWidth / 2, yPos + cardHeight - 10, { align: 'center' });
  }

  return Buffer.from(doc.output('arraybuffer'));
}
