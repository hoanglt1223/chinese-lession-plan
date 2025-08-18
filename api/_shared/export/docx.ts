import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions } from '../cors.js';
import { handleError } from '../error-handler.js';
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
        text: "_______________________________________________",
        alignment: AlignmentType.CENTER,
        style: "normalParagraph",
      }));
    } else {
      // Handle regular text with basic formatting
      const textRuns: TextRun[] = [];
      let currentText = line;
      
      // Process bold text (**text**)
      const boldRegex = /\*\*(.*?)\*\*/g;
      let lastIndex = 0;
      let match;
      
      while ((match = boldRegex.exec(currentText)) !== null) {
        // Add text before bold
        if (match.index > lastIndex) {
          textRuns.push(new TextRun({
            text: currentText.substring(lastIndex, match.index),
            font: "Montserrat",
            size: 22, // 11pt
          }));
        }
        
        // Add bold text
        textRuns.push(new TextRun({
          text: match[1],
          bold: true,
          font: "Montserrat",
          size: 22, // 11pt
        }));
        
        lastIndex = match.index + match[0].length;
      }
      
      // Add remaining text
      if (lastIndex < currentText.length) {
        textRuns.push(new TextRun({
          text: currentText.substring(lastIndex),
          font: "Montserrat",
          size: 22, // 11pt
        }));
      }
      
      // If no formatting was found, just add the whole line
      if (textRuns.length === 0) {
        textRuns.push(new TextRun({
          text: currentText,
          font: "Montserrat",
          size: 22, // 11pt
        }));
      }
      
      paragraphs.push(new Paragraph({
        children: textRuns,
        style: "normalParagraph",
      }));
    }
  }
  
  return paragraphs;
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
    const { content, lessonPlans, summaries, step, singleLesson, singleSummary } = req.body;
    
    let docContent = '';
    let filename = `export_${Date.now()}.docx`;
    
    if (singleLesson || singleSummary) {
      // Export single lesson or summary file
      docContent = content || 'No content available for export.';
      filename = `lesson_${Date.now()}.docx`;
    } else if (step === 2 && lessonPlans && lessonPlans.length > 0) {
      // Export 4 lesson plans for Step 2 (combined - shouldn't be used anymore)
      docContent = `# 4-Lesson Unit Plan\n\n`;
      
      lessonPlans.forEach((lesson: any, index: number) => {
        docContent += `## Lesson ${lesson.lessonNumber || index + 1}: ${lesson.title || `Lesson ${index + 1}`}\n`;
        docContent += `**Type:** ${lesson.type || 'N/A'}\n\n`;
        docContent += `${lesson.content || 'No content available'}\n\n`;
        docContent += '---\n\n';
      });
      
      filename = `4_lesson_plans_${Date.now()}.docx`;
    } else if (step === 4 && summaries && summaries.length > 0) {
      // Export 4 lesson summaries for Step 4 (combined - shouldn't be used anymore)
      docContent = `# 4-Lesson Summaries\n\n`;
      
      summaries.forEach((summary: any, index: number) => {
        docContent += `## Lesson ${summary.lessonNumber || index + 1}: ${summary.title || `Summary ${index + 1}`}\n\n`;
        docContent += `${summary.content || 'No content available'}\n\n`;
        docContent += '---\n\n';
      });
      
      filename = `4_lesson_summaries_${Date.now()}.docx`;
    } else if (content) {
      // Fallback for general content export
      docContent = content;
    } else {
      docContent = '# Export Content\n\nNo content available for export.';
    }

    // Create proper DOCX document
    const doc = new Document({
      styles: {
        paragraphStyles: [
          {
            id: "normalParagraph",
            name: "Normal Paragraph",
            basedOn: "Normal",
            next: "Normal",
            run: {
              font: "Montserrat",
              size: "11pt",
            },
            paragraph: {
              spacing: {
                line: 276,
              },
            },
          },
        ],
      },
      sections: [
        {
          properties: {},
          children: parseMarkdownToDocx(docContent),
        },
      ],
    });

    // Generate DOCX buffer
    const buffer = await Packer.toBuffer(doc);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    
    return res.send(buffer);
  } catch (error: any) {
    return handleError(res, error, 'DOCX Export API');
  }
}
