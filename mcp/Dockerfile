FROM python:3.12-slim
WORKDIR /app

RUN pip install --no-cache-dir uv

COPY pyproject.toml ./
RUN uv pip install --system --no-cache \
    "mcp[cli]>=1.0" "httpx>=0.27" "python-dotenv>=1.0" "openai>=1.50,<2"

COPY server.py trainer_prompt.py ./

RUN useradd --system --uid 10001 --no-create-home kinetic
USER kinetic

ENV MCP_TRANSPORT=streamable-http
ENV HOST=0.0.0.0
ENV PORT=8080

CMD ["python", "server.py"]
