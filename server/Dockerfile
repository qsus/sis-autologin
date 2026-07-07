FROM mcr.microsoft.com/playwright/python:v1.44.0-jammy

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the repository
COPY . .

EXPOSE 7791

# Run Python with unbuffered output (-u) to ensure logs stream correctly
CMD ["python", "-u", "main.py"]
