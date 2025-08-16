import type { VercelRequest, VercelResponse } from '@vercel/node';
import { insertLessonSchema } from '../_shared/schema.js';
import { storage } from '../_shared/storage.js';
import { setCorsHeaders, handleOptions } from '../_shared/cors.js';
import { handleError } from '../_shared/error-handler.js';
import { initializeDatabase } from '../_shared/init-db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  // Initialize database on first request
  await initializeDatabase();

  try {
    switch (req.method) {
      case 'GET':
        // Check if this is a request for a specific lesson
        const { id } = req.query;
        
        if (id && typeof id === 'string') {
          // Get specific lesson by ID
          const lesson = await storage.getLesson(id);
          if (!lesson) {
            return res.status(404).json({ message: "Lesson not found" });
          }
          return res.json(lesson);
        } else {
          // Get all lessons
          const lessons = await storage.getAllLessons();
          return res.json(lessons);
        }

      case 'POST':
        // Check if this is a create or get/update operation
        const { action, lessonId, ...data } = req.body;
        
        if (action === 'get' && lessonId) {
          // Get specific lesson by ID from body
          const lesson = await storage.getLesson(lessonId);
          if (!lesson) {
            return res.status(404).json({ message: "Lesson not found" });
          }
          return res.json(lesson);
        } else if (action === 'update' && lessonId) {
          // Update specific lesson
          const updatedLesson = await storage.updateLesson(lessonId, data);
          if (!updatedLesson) {
            return res.status(404).json({ message: "Lesson not found" });
          }
          return res.json(updatedLesson);
        } else {
          // Create new lesson - filter out any legacy fields that don't match schema
          const cleanData: any = {
            title: data.title,
            level: data.level,
            ageGroup: data.ageGroup,
            status: data.status,
            ...(data.originalFiles && { originalFiles: data.originalFiles }),
            ...(data.aiAnalysis && { aiAnalysis: data.aiAnalysis }),
            ...(data.flashcards && { flashcards: data.flashcards })
          };
          
          // Only include lessonPlans if it's in the correct format (array of objects)
          if (data.lessonPlans && Array.isArray(data.lessonPlans) && data.lessonPlans.length > 0 && 
              typeof data.lessonPlans[0] === 'object' && 'lessonNumber' in data.lessonPlans[0]) {
            cleanData.lessonPlans = data.lessonPlans;
          }
          
          // Only include summaries if it's in the correct format
          if (data.summaries && Array.isArray(data.summaries) && data.summaries.length > 0 && 
              typeof data.summaries[0] === 'object' && 'lessonNumber' in data.summaries[0]) {
            cleanData.summaries = data.summaries;
          }
          
          const validatedData = insertLessonSchema.parse(cleanData);
          const lesson = await storage.createLesson(validatedData as any);
          return res.json({ lesson });
        }

      case 'PUT':
        // Update lesson using body
        const { id: updateId, ...updateData } = req.body;
        if (!updateId) {
          return res.status(400).json({ message: 'Lesson ID is required' });
        }
        
        console.log('PUT request - Updating lesson:', updateId);
        console.log('Update data keys:', Object.keys(updateData));
        
        let updatedLesson = await storage.updateLesson(updateId, updateData);
        if (!updatedLesson) {
          console.log('Lesson not found, creating new lesson with provided ID');
          // If lesson doesn't exist, create it with the provided ID and data
          try {
            // Clean and validate data for new lesson creation
            const cleanData: any = {
              title: updateData.title || 'New Lesson',
              level: updateData.level || 'N1',
              ageGroup: updateData.ageGroup || 'preschool',
              status: updateData.status || 'draft',
              ...(updateData.originalFiles && { originalFiles: updateData.originalFiles }),
              ...(updateData.aiAnalysis && { aiAnalysis: updateData.aiAnalysis }),
              ...(updateData.flashcards && { flashcards: updateData.flashcards })
            };
            
            // Only include lessonPlans if it's in the correct format (array of objects)
            if (updateData.lessonPlans && Array.isArray(updateData.lessonPlans) && updateData.lessonPlans.length > 0 && 
                typeof updateData.lessonPlans[0] === 'object' && 'lessonNumber' in updateData.lessonPlans[0]) {
              cleanData.lessonPlans = updateData.lessonPlans;
            }
            
            // Only include summaries if it's in the correct format
            if (updateData.summaries && Array.isArray(updateData.summaries) && updateData.summaries.length > 0 && 
                typeof updateData.summaries[0] === 'object' && 'lessonNumber' in updateData.summaries[0]) {
              cleanData.summaries = updateData.summaries;
            }
            
            const validatedData = insertLessonSchema.parse(cleanData);
            updatedLesson = await storage.createLesson(validatedData as any);
            // Override the generated ID with the requested ID
            updatedLesson.id = updateId;
            await storage.updateLesson(updatedLesson.id, { id: updateId });
          } catch (error) {
            console.error('Failed to create lesson:', error);
            return res.status(404).json({ 
              message: "Lesson not found and could not be created",
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
        return res.json(updatedLesson);

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error: any) {
    return handleError(res, error, 'Lessons API');
  }
}
