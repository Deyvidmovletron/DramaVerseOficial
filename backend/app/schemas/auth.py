from pydantic import BaseModel, EmailStr, Field


class LoginIn(BaseModel):
    email: EmailStr
    senha: str


class TokenOut(BaseModel):
    # O refresh token não trafega mais aqui — vai só no cookie httpOnly (o JS nunca
    # tem acesso a ele, o que reduz o que um XSS conseguiria roubar).
    access_token: str
    token_type: str = "bearer"


class EsqueciSenhaIn(BaseModel):
    email: EmailStr


class RedefinirSenhaIn(BaseModel):
    token: str
    nova_senha: str = Field(min_length=6)


class AtualizarPerfilIn(BaseModel):
    nome: str = Field(min_length=1, max_length=120)
    email: EmailStr


class TrocarSenhaIn(BaseModel):
    senha_atual: str
    nova_senha: str = Field(min_length=6)
