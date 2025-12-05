$baseUrl = "http://localhost:5000"
$outlineFile = "d:\Projects\chinese-lession-plan\docs\final-real-work\Super Learners Course Outline.xlsx"

function Write-Color([string]$text, [ConsoleColor]$color) {
    Write-Host $text -ForegroundColor $color
}

# 1. Check Health
Write-Color "1. Checking API Health..." Cyan
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method Get -ErrorAction Stop
    Write-Color "OK Health Check Passed: $($health.status)" Green
} catch {
    Write-Color "ERROR Health Check Failed: $_" Red
    exit 1
}

# 2. Upload File (Import)
Write-Color "`n2. Uploading Course Outline..." Cyan
$boundary = [System.Guid]::NewGuid().ToString()
$LF = "`r`n"

$fileBytes = [System.IO.File]::ReadAllBytes($outlineFile)
$fileHeader = "--$boundary$LF" +
              "Content-Disposition: form-data; name=""file""; filename=""Super Learners Course Outline.xlsx""$LF" +
              "Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet$LF$LF"
$fileFooter = "$LF--$boundary--$LF"

$enc = [System.Text.Encoding]::GetEncoding("iso-8859-1")
$bodyBytes = $enc.GetBytes($fileHeader) + $fileBytes + $enc.GetBytes($fileFooter)

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/course-ops?action=import" `
        -Method Post `
        -ContentType "multipart/form-data; boundary=$boundary" `
        -Body $bodyBytes `
        -ErrorAction Stop
    
    if ($response.success -eq $true) {
        Write-Color "OK Import Successful. Lessons: $($response.lessonCount), Storage: $($response.storage)" Green
    } else {
        Write-Color "ERROR Import Failed: $($response.message)" Red
        exit 1
    }
} catch {
    Write-Color "ERROR Upload Failed: $_" Red
    exit 1
}

# 3. Get Structure to find a lesson
Write-Color "`n3. Fetching Course Structure..." Cyan
try {
    $structure = Invoke-RestMethod -Uri "$baseUrl/api/course-ops?action=structure" -Method Get -ErrorAction Stop
    
    # Get first unit and first lesson
    $firstUnitKey = ($structure.structure | Get-Member -MemberType NoteProperty).Name | Select-Object -First 1
    $lessons = $structure.structure.$firstUnitKey
    
    if ($lessons.Count -gt 0) {
        $targetLesson = $lessons[0]
        $unitNum = $targetLesson.unitNumber
        $lessonNum = $targetLesson.lessonNumber
        Write-Color "OK Found Target Lesson: Unit $unitNum, Lesson $lessonNum ($($targetLesson.title))" Green
    } else {
        Write-Color "ERROR No lessons found in structure" Red
        exit 1
    }
} catch {
    Write-Color "ERROR Fetch Structure Failed: $_" Red
    exit 1
}

# 4. Generate Plan (GLM-4.6)
Write-Color "`n4. Generating Plan (GLM-4.6)..." Cyan
$payload = @{
    unitNumber = $unitNum
    lessonNumber = $lessonNum
    force = $true # Force regeneration to test AI
    skipFlashcards = $false
} | ConvertTo-Json

try {
    # Increase timeout for AI generation
    $response = Invoke-RestMethod -Uri "$baseUrl/api/course-ops?action=generate" `
        -Method Post `
        -Body $payload `
        -ContentType "application/json" `
        -TimeoutSec 300 `
        -ErrorAction Stop
        
    if ($response.success -eq $true) {
        Write-Color "OK Generation Successful!" Green
        Write-Color "   - Plan: $($response.results.plan)" Green
        Write-Color "   - Flashcards: $($response.results.flashcards)" Green
        
        if ($response.results.plan -eq "generated") {
             Write-Color "   - Content generated successfully." Green
        }
    } else {
        Write-Color "ERROR Generation Failed: $($response.message)" Red
        exit 1
    }
} catch {
    Write-Color "ERROR Generate Call Failed: $_" Red
    exit 1
}

Write-Color "`nAll Tests Completed Successfully!" Green
