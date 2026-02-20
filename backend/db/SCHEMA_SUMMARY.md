# Database Schema Summary

## Entity Relationship Diagram

```
┌─────────────┐
│   users     │
│─────────────│
│ id (PK)     │
│ email       │
│ ...         │
└──────┬──────┘
       │
       │ 1:N
       │
┌──────▼──────────┐      ┌──────────────────┐
│   sessions      │      │ reference_images │
│─────────────────│      │──────────────────│
│ id (PK)         │      │ id (PK)          │
│ user_id (FK)    │◄─────┤ user_id (FK)     │
│ title           │      │ session_id (FK)  │
│ thumbnail_url   │      │ gcp_bucket_path  │
│ generated_count │      │ gcp_url          │
└──────┬──────────┘      │ ...              │
       │                  └────────┬─────────┘
       │ 1:N                      │
       │                           │ N:M
       │                  ┌───────▼──────────────────────┐
       │                  │ generation_job_reference_    │
       │                  │ images (junction table)      │
       │                  │──────────────────────────────│
       │                  │ generation_job_id (FK)       │
       │                  │ reference_image_id (FK)      │
       │                  └───────┬──────────────────────┘
       │                          │
       │                          │ N:1
       │                  ┌───────▼──────────────┐
       │                  │ generation_jobs     │
       │                  │─────────────────────│
       │                  │ id (PK)            │
       │                  │ user_id (FK)       │
       │                  │ session_id (FK)    │
       │                  │ prompt             │
       │                  │ generated_prompt   │
       │                  │ shot_type          │
       │                  │ camera_angle      │
       │                  │ style              │
       │                  │ location           │
       │                  │ lighting           │
       │                  │ weather            │
       │                  │ aspect_ratio       │
       │                  │ number_of_shots    │
       │                  │ status             │
       │                  │ ...                │
       │                  └───────┬────────────┘
       │                          │
       │                          │ 1:N
       │                  ┌───────▼──────────────┐
       │                  │ generated_images     │
       │                  │─────────────────────│
       │                  │ id (PK)            │
       │                  │ generation_job_id  │
       │                  │ user_id (FK)       │
       │                  │ session_id (FK)    │
       │                  │ gcp_bucket_path    │
       │                  │ gcp_url            │
       │                  │ thumbnail_url      │
       │                  │ generation_index   │
       │                  │ ...                │
       │                  └────────────────────┘
       │
       │ 1:N
       │
```

## Table Relationships

### One-to-Many Relationships

1. **users → sessions**: One user can have many sessions
2. **users → reference_images**: One user can upload many reference images
3. **users → generation_jobs**: One user can create many generation jobs
4. **users → generated_images**: One user can generate many images
5. **sessions → generation_jobs**: One session can contain many generation jobs
6. **sessions → generated_images**: One session can contain many generated images
7. **generation_jobs → generated_images**: One job can produce many images (based on `number_of_shots`)

### Many-to-Many Relationships

1. **generation_jobs ↔ reference_images**: 
   - One generation job can use many reference images
   - One reference image can be used in many generation jobs
   - Linked via `generation_job_reference_images` junction table

## Key Design Decisions

### 1. Sessions Table
- **Why**: Organizes user's work into logical groups
- **Thumbnail**: Automatically updated via trigger when first image is generated
- **Count**: Automatically maintained via trigger

### 2. Reference Images Table
- **Why**: Separate table allows reuse across multiple generation jobs
- **GCP Path**: Stores full bucket path for easy retrieval
- **Optional Session Link**: Can be linked to session if uploaded during a session

### 3. Generation Jobs Table
- **Why**: Complete audit trail of all generation requests
- **Status Tracking**: Allows async processing with status updates
- **All Parameters**: Stores all UI settings for reproducibility

### 4. Generated Images Table
- **Why**: Separate table allows multiple images per job
- **Denormalized Fields**: `user_id` and `session_id` stored for faster queries
- **Index Field**: Tracks position in batch (1, 2, 3, etc.)

### 5. Junction Table
- **Why**: Many-to-many relationship between jobs and reference images
- **Unique Constraint**: Prevents duplicate links

## GCP Storage Paths

### Reference Images
```
video-gen-image-bucket/uploads/{user_id}/{timestamp}_{filename}
```

### Generated Images
```
video-gen-image-bucket/generated/{generation_job_id}/{index}_{timestamp}.jpg
```

## Status Flow for Generation Jobs

```
pending → processing → completed
                    ↓
                  failed
```

## Common Query Patterns

### 1. Get User's Sessions with Thumbnails
```sql
SELECT s.*, 
       (SELECT gcp_url FROM generated_images 
        WHERE session_id = s.id 
        ORDER BY created_at ASC LIMIT 1) as thumbnail_url
FROM sessions s
WHERE s.user_id = $1
ORDER BY s.updated_at DESC;
```

### 2. Get Generation Job with Settings
```sql
SELECT gj.*, 
       array_agg(ri.gcp_url) as reference_image_urls
FROM generation_jobs gj
LEFT JOIN generation_job_reference_images gjri ON gj.id = gjri.generation_job_id
LEFT JOIN reference_images ri ON gjri.reference_image_id = ri.id
WHERE gj.id = $1
GROUP BY gj.id;
```

### 3. Get All Images in a Session
```sql
SELECT gi.*
FROM generated_images gi
WHERE gi.session_id = $1
ORDER BY gi.generation_index ASC, gi.created_at ASC;
```

### 4. Get User's Reference Images
```sql
SELECT ri.*
FROM reference_images ri
WHERE ri.user_id = $1
ORDER BY ri.uploaded_at DESC;
```

## Indexes

All foreign keys are indexed for join performance:
- `idx_sessions_user_id`
- `idx_reference_images_user_id`
- `idx_generation_jobs_user_id`
- `idx_generated_images_generation_job_id`

Status and timestamp fields are indexed for filtering/sorting:
- `idx_generation_jobs_status`
- `idx_generation_jobs_created_at`
- `idx_sessions_created_at`

## Triggers

1. **Auto-update timestamps**: `updated_at` fields automatically updated
2. **Session thumbnail**: Updated when first image is generated
3. **Session count**: Updated when images are added/deleted

## Migration

To apply the schema:

```sql
-- First apply base schema
\i db/schema.sql

-- Then apply image generation schema
\i db/schema_image_generation.sql
```

Both schemas are idempotent and safe to run multiple times.
