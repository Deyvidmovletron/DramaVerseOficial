from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: str = "development"
    secret_key: str = "insecure-dev-key-change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30
    reset_password_token_expire_minutes: int = 30

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_use_tls: bool = True

    frontend_url: str = "http://localhost:5173"

    database_url: str = "sqlite:///./data/streaming.db"

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    media_root: str = "./media"

    mercadopago_access_token: str = ""
    mercadopago_public_key: str = ""
    mercadopago_webhook_secret: str = ""
    mercadopago_back_url: str = "http://localhost:5173/assinatura"

    first_admin_name: str = "Administrador"
    first_admin_email: str = "admin@stream-mais.com"
    first_admin_password: str = "troque-esta-senha"

    @property
    def cookie_secure(self) -> bool:
        # Fora de 'development' assumimos HTTPS (o cookie Secure não é enviado em HTTP puro,
        # então isso só deve ficar True quando o deploy real estiver atrás de TLS).
        return self.environment != "development"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def media_root_path(self) -> Path:
        path = (BASE_DIR / self.media_root).resolve() if not Path(self.media_root).is_absolute() else Path(self.media_root)
        path.mkdir(parents=True, exist_ok=True)
        return path


settings = Settings()
