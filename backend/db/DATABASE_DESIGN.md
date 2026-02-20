# Database Design for Image Generation System

## Overview

This document describes the database schema for storing user sessions, uploaded reference images, generation jobs, and generated images. The system integrates with Google Cloud Storage (GCP) bucket `video-gen-image-bucket` for image storage.

## Database Tables

### 1. `sessions` Table

Organizes generation requests into user sessions for better organization and navigation.

**Purpose**: Allows users to group related image generations together (similar to the session navigation panel in the UI).

**Key Fields**:
- `id`: Primary key
- `user_id`: Foreign key to `users` table
- `title`: Session name (default: "New Session")
- `thumbnail_url`: URL to the first generated image in the session (for UI display)
- `generated_count`: Number of images generated in this session
- `created_at`, `updated_at`: Timestamps

**Relationships**:
- One user can have many sessions
- One session can have many generation jobs
- One session can have many generated images

### 2. `reference_images` Table

Stores metadata about uploaded reference images that users can use for generation.

**Purpose**: Tracks user-uploaded images stored in GCP bucket `video-gen-image-bucket`.

**Key Fields**:
- `id`: Primary key
- `user_id`: Foreign key to `users` table
- `session_id`: Optional foreign key to `sessions` table (if uploaded during a session)
- `gcp_bucket_path`: Full path in GCP bucket (e.g., `video-gen-image-bucket/uploads/user123/image.jpg`)
- `gcp_url`: Public or signed URL to access the image
- `file_name`, `file_size`, `mime_type`: File metadata
- `width`, `height`: Image dimensions
- `uploaded_at`: When the image was uploaded

**Storage Path**: `video-gen-image-bucket/uploads/{user_id}/{timestamp}_{filename}`

**Relationships**:
- One user can have many reference images
- One reference image can be used in many generation jobs (many-to-many via junction table)

### 3. `generation_jobs` Table

Stores each generation request with all parameters and settings.

**Purpose**: Tracks every image generation request with complete metadata for reproducibility and history.

**Key Fields**:
- `id`: Primary key
- `user_id`: Foreign key to `users` table
- `session_id`: Optional foreign key to `sessions` table
- `prompt`: Original user prompt
- `generated_prompt`: AI-enhanced/generated prompt
- `shot_type`, `camera_angle`, `style`: Enum values from UI
- `location`, `lighting`, `weather`: Location settings
- `is_custom_enabled`: Boolean flag
- `aspect_ratio`: Aspect ratio (e.g., "16:9", "1:1", "9:16")
- `number_of_shots`: Number of images to generate (1-10)
- `model_used`: Model name (e.g., "DALL-E")
- `status`: Job status ('pending', 'processing', 'completed', 'failed')
- `error_message`: Error details if generation failed
- `generation_method`: Method used ('openai', 'fallback', etc.)
- `started_at`, `completed_at`: Timestamps for job lifecycle

**Relationships**:
- One user can have many generation jobs
- One generation job can have many generated images (1-to-many)
- One generation job can use many reference images (many-to-many via junction table)

### 4. `generated_images` Table

Stores metadata about generated output images.

**Purpose**: Tracks all generated images stored in GCP bucket `video-gen-image-bucket/generated`.

**Key Fields**:
- `id`: Primary key
- `generation_job_id`: Foreign key to `generation_jobs` table
- `user_id`: Foreign key to `users` table (denormalized for faster queries)
- `session_id`: Foreign key to `sessions` table (denormalized for faster queries)
- `gcp_bucket_path`: Full path in GCP bucket (e.g., `video-gen-image-bucket/generated/job123/image1.jpg`)
- `gcp_url`: Public or signed URL to access the image
- `thumbnail_url`: URL to thumbnail version (if generated)
- `file_name`, `file_size`, `mime_type`: File metadata
- `width`, `height`: Image dimensions
- `prompt_used`: The specific prompt used for this image
- `generation_index`: Index in the batch (1, 2, 3, etc.)
- `created_at`: When the image was generated

**Storage Path**: `video-gen-image-bucket/generated/{generation_job_id}/{index}_{timestamp}.jpg`

**Relationships**:
- Many generated images belong to one generation job
- Many generated images belong to one session
- Many generated images belong to one user

### 5. `generation_job_reference_images` Junction Table

Links reference images to generation jobs (many-to-many relationship).

**Purpose**: Tracks which reference images were used in each generation job.

**Key Fields**:
- `id`: Primary key
- `generation_job_id`: Foreign key to `generation_jobs` table
- `reference_image_id`: Foreign key to `reference_images` table
- `created_at`: When the link was created

**Relationships**:
- One generation job can use many reference images
- One reference image can be used in many generation jobs

## Data Flow

### 1. User Uploads Reference Image

```
User uploads image → 
  Upload to GCP: video-gen-image-bucket/uploads/{user_id}/{timestamp}_{filename} →
  Get GCP URL →
  Insert into reference_images table →
  Return image URL to frontend
```

### 2. User Creates Generation Request

```
User fills prompt panel →
  Create/select session →
  Create generation_job record with all parameters →
  Link reference images via generation_job_reference_images →
  Call AI service to generate prompt →
  Update generation_job with generated_prompt →
  Set status to 'processing' →
  Generate images →
  Upload to GCP: video-gen-image-bucket/generated/{job_id}/{index}.jpg →
  Insert into generated_images table →
  Update generation_job status to 'completed' →
  Update session thumbnail and count (via trigger)
```

### 3. User Views Session History

```
Query sessions table for user →
  Join with generated_images to get thumbnails →
  Return session list with metadata
```

## Indexes

The schema includes indexes on:
- Foreign keys (for join performance)
- `status` field (for filtering jobs by status)
- Timestamp fields (for sorting by date)
- User IDs (for user-specific queries)

## Triggers

### Automatic Session Updates

1. **`update_session_on_image_generation`**: Automatically updates session thumbnail and count when a new image is generated
2. **`update_session_on_image_deletion`**: Updates session count when an image is deleted

### Automatic Timestamp Updates

All tables with `updated_at` fields have triggers to automatically update the timestamp on row updates.

## GCP Storage Structure

```
video-gen-image-bucket/
├── uploads/
│   └── {user_id}/
│       └── {timestamp}_{filename}
└── generated/
    └── {generation_job_id}/
        ├── 1_{timestamp}.jpg
        ├── 2_{timestamp}.jpg
        └── ...
```

## Example Queries

### Get all sessions for a user with thumbnail
```sql
SELECT s.*, 
       (SELECT gcp_url FROM generated_images 
        WHERE session_id = s.id 
        ORDER BY created_at ASC LIMIT 1) as thumbnail_url
FROM sessions s
WHERE s.user_id = $1
ORDER BY s.updated_at DESC;
```

### Get generation job with all reference images
```sql
SELECT gj.*, 
       array_agg(ri.gcp_url) as reference_image_urls
FROM generation_jobs gj
LEFT JOIN generation_job_reference_images gjri ON gj.id = gjri.generation_job_id
LEFT JOIN reference_images ri ON gjri.reference_image_id = ri.id
WHERE gj.id = $1
GROUP BY gj.id;
```

### Get all generated images for a session
```sql
SELECT gi.*
FROM generated_images gi
WHERE gi.session_id = $1
ORDER BY gi.generation_index ASC, gi.created_at ASC;
```

## Migration Instructions

1. Run the base schema first: `db/schema.sql`
2. Run the image generation schema: `db/schema_image_generation.sql`
3. The schema includes idempotent checks, so it's safe to run multiple times

## Notes

- All foreign keys use `ON DELETE CASCADE` or `ON DELETE SET NULL` appropriately
- Timestamps use `TIMESTAMP WITH TIME ZONE` for proper timezone handling
- The schema is designed to be extensible (e.g., adding more metadata fields)
- Denormalized fields (`user_id`, `session_id` in `generated_images`) improve query performance at the cost of some storage
