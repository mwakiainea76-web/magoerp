# Certification API

Base URL: `/api`

---

## Certification Authorities

### GET /certification-authorities

List certification authorities (e.g., KNEC, KASNEB, CDACC).

**Permissions**: `certification.view`

**Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Kenya National Examination Council",
      "code": "KNEC",
      "description": "National examination body",
      "is_active": true
    }
  ],
  "meta": { ... }
}
```

### POST /certification-authorities

**Permissions**: `certification.create`

**Body**:
```json
{
  "name": "Kenya National Examination Council",
  "code": "KNEC",
  "description": "National examination body"
}
```

### PUT /certification-authorities/{authority}
### DELETE /certification-authorities/{authority}

---

## Certification Levels

### GET /certification-levels

List certification levels within an authority.

**Query Parameters**: `certification_authority_id`

**Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Diploma",
      "code": "DIP",
      "authority": { "name": "KNEC", "code": "KNEC" },
      "sort_order": 1,
      "is_active": true
    }
  ],
  "meta": { ... }
}
```

### POST /certification-levels

**Permissions**: `certification.create`

**Body**:
```json
{
  "certification_authority_id": "uuid",
  "name": "Diploma",
  "code": "DIP",
  "sort_order": 1
}
```

### PUT /certification-levels/{level}
### DELETE /certification-levels/{level}
