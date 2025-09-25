FROM public.ecr.aws/docker/library/python:3.11-slim

WORKDIR /app

# Instala dependências de sistema necessárias
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copia requirements primeiro para aproveitar cache
COPY requirements.txt .

# Instala requirements se existir, senão instala fallback mínimo
RUN if [ -f "requirements.txt" ]; then \
        pip install --no-cache-dir -r requirements.txt ; \
    else \
        pip install --no-cache-dir \
            pandas \
            sqlalchemy \
            psycopg2-binary \
            openpyxl ; \
    fi

# Copia scripts ETL
COPY . .

# Executa múltiplos scripts (pode alterar a ordem conforme necessário)
CMD ["python", "etl_base1.py", "etl_base2.py"]
