FROM python:3.11-slim

WORKDIR /app

# システム依存パッケージのインストール
RUN apt-get update && apt-get install -y build-essential gcc libpq-dev && rm -rf /var/lib/apt/lists/*

# Python依存パッケージのインストール
COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

# アプリケーションコードのコピー
COPY . .

# ポート指定
EXPOSE 8000

# UvicornでFastAPIを起動
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"] 