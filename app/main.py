from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from . import db
from .api import router

app = FastAPI(title="心晴 API", docs_url="/api/docs")
db.init()
app.include_router(router, prefix="/api")
app.mount("/", StaticFiles(directory=Path(__file__).parent / "static", html=True), name="static")
