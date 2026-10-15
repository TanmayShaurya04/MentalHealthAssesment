import os
import json
import uuid
import datetime
from typing import Dict, Any, List, Optional
from app.config import settings

# In-memory / file-based storage fallback for development without MongoDB
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
os.makedirs(DATA_DIR, exist_ok=True)

class JsonCursor:
    def __init__(self, docs: List[Dict[str, Any]]):
        self._docs = docs

    def sort(self, key_or_list, direction=None):
        if isinstance(key_or_list, str):
            key = key_or_list
            reverse = (direction == -1)
        elif isinstance(key_or_list, list) and key_or_list:
            key, dir_val = key_or_list[0]
            reverse = (dir_val == -1)
        else:
            return self

        def sort_key(d):
            val = d.get(key)
            if val is None:
                return ""
            return str(val)

        self._docs.sort(key=sort_key, reverse=reverse)
        return self

    def skip(self, n: int):
        self._docs = self._docs[n:]
        return self

    def limit(self, n: int):
        self._docs = self._docs[:n]
        return self

    async def to_list(self, length: Optional[int] = None) -> List[Dict[str, Any]]:
        if length is not None:
            return self._docs[:length]
        return self._docs

    def __aiter__(self):
        self._iter = iter(self._docs)
        return self

    async def __anext__(self):
        try:
            return next(self._iter)
        except StopIteration:
            raise StopAsyncIteration

class JsonCollection:
    def __init__(self, name: str):
        self.name = name
        self.file_path = os.path.join(DATA_DIR, f"{name}.json")
        self._ensure_file()

    def _ensure_file(self):
        if not os.path.exists(self.file_path):
            with open(self.file_path, "w", encoding="utf-8") as f:
                json.dump([], f)

    def _load(self) -> List[Dict[str, Any]]:
        try:
            with open(self.file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    def _save(self, docs: List[Dict[str, Any]]):
        with open(self.file_path, "w", encoding="utf-8") as f:
            json.dump(docs, f, default=str, indent=2)

    def _match(self, doc: Dict[str, Any], query: Dict[str, Any]) -> bool:
        for k, v in query.items():
            if k == "_id" and str(doc.get("_id")) == str(v):
                continue
            if isinstance(v, dict):
                # Simple operators
                if "$in" in v:
                    doc_val = doc.get(k)
                    if isinstance(doc_val, list):
                        if not any(item in v["$in"] for item in doc_val):
                            return False
                    elif doc_val not in v["$in"]:
                        return False
                elif "$gte" in v or "$lte" in v:
                    val = str(doc.get(k, ""))
                    if "$gte" in v and val < str(v["$gte"]):
                        return False
                    if "$lte" in v and val > str(v["$lte"]):
                        return False
            else:
                if doc.get(k) != v:
                    return False
        return True

    async def find_one(self, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        docs = self._load()
        for d in docs:
            if self._match(d, query):
                return d
        return None

    def find(self, query: Optional[Dict[str, Any]] = None) -> JsonCursor:
        docs = self._load()
        if query:
            matched = [d for d in docs if self._match(d, query)]
        else:
            matched = list(docs)
        return JsonCursor(matched)

    async def insert_one(self, doc: Dict[str, Any]):
        docs = self._load()
        if "_id" not in doc:
            doc["_id"] = str(uuid.uuid4())
        docs.append(doc)
        self._save(docs)
        class InsertResult:
            inserted_id = doc["_id"]
        return InsertResult()

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any]):
        docs = self._load()
        modified = 0
        for i, d in enumerate(docs):
            if self._match(d, query):
                if "$set" in update:
                    d.update(update["$set"])
                docs[i] = d
                modified = 1
                break
        if modified:
            self._save(docs)
        class UpdateResult:
            modified_count = modified
        return UpdateResult()

    async def delete_one(self, query: Dict[str, Any]):
        docs = self._load()
        initial_len = len(docs)
        docs = [d for d in docs if not self._match(d, query)]
        deleted = initial_len - len(docs)
        if deleted:
            self._save(docs)
        class DeleteResult:
            deleted_count = deleted
        return DeleteResult()

    async def count_documents(self, query: Optional[Dict[str, Any]] = None) -> int:
        docs = self._load()
        if not query:
            return len(docs)
        return len([d for d in docs if self._match(d, query)])

class DatabaseManager:
    def __init__(self):
        self.client = None
        self.db = None
        self.is_mongo = False

    async def connect(self):
        if settings.MONGODB_URL:
            try:
                import motor.motor_asyncio
                self.client = motor.motor_asyncio.AsyncIOMotorClient(
                    settings.MONGODB_URL,
                    serverSelectionTimeoutMS=3000
                )
                self.db = self.client[settings.DATABASE_NAME]
                # Test connection
                await self.client.admin.command('ping')
                self.is_mongo = True
                print("Connected successfully to MongoDB Atlas.")
                return
            except Exception as e:
                print(f"MongoDB connection failed ({e}). Falling back to file-backed database.")
                self.is_mongo = False
        else:
            print("No MONGODB_URL configured. Running with file-backed storage (data/).")
            self.is_mongo = False

    def get_collection(self, name: str):
        if self.is_mongo and self.db is not None:
            return self.db[name]
        return JsonCollection(name)

db_manager = DatabaseManager()

def get_db():
    return db_manager
