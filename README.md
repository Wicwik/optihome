# OptiHome

Real estate scraper and visualization tool for nehnutelnosti.sk with multi-objective optimization (Pareto-optimal solutions).

## Features

- **Web Scraping**: Automated scraping of flats and houses from nehnutelnosti.sk
- **Interactive Map**: Leaflet map with marker clustering showing all properties
- **Pareto Optimization**: Highlights properties that are Pareto-optimal based on:
  - Minimize price
  - Minimize price per m²
  - Maximize rooms
  - Maximize year built
- **Filtering**: Filter by type, price, rooms, area, year, and map bounds
- **Geocoding**: Automatic geocoding of addresses using Nominatim (with caching)
- **Scheduled Scraping**: Optional scheduled scraping via APScheduler

## Quick Start

### Using Docker Compose

```bash
docker-compose up --build
```

Services:
- **API**: http://localhost:8000/docs (FastAPI Swagger UI)
- **Web**: http://localhost:5173 (React frontend)
- **Database**: PostgreSQL on port 5432

### Environment Variables

Create a `.env` file (optional):

```env
POSTGRES_USER=opti
POSTGRES_PASSWORD=opti
POSTGRES_DB=optihome
CORS_ORIGINS=http://localhost:5173
VITE_API_BASE_URL=http://localhost:8000

# Scheduler (optional)
ENABLE_SCHEDULER=false
SCHEDULE_HOUR=2
SCHEDULE_MINUTE=0
SCRAPE_PAGES_PER_RUN=5
```

## Usage

### Manual Scraping

Trigger scraping via API:

```bash
# Scrape flats (2 pages)
curl -X POST "http://localhost:8000/scrape/run?kind=flat&pages=2"

# Scrape houses (1 page)
curl -X POST "http://localhost:8000/scrape/run?kind=house&pages=1"
```

### API Endpoints

- `GET /properties` - List properties with filters
- `GET /properties/{id}` - Get property details
- `GET /properties/pareto` - Get Pareto-optimal properties
- `POST /scrape/run` - Trigger scraping

### Running Tests

```bash
docker compose exec backend pytest
```

## Architecture

- **Backend**: FastAPI + SQLAlchemy + PostgreSQL
- **Frontend**: React + TypeScript + Vite + Leaflet
- **Scraping**: BeautifulSoup4 + httpx with rate limiting
- **Geocoding**: Nominatim with database caching
- **Scheduler**: APScheduler for periodic scraping

## Development

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```



