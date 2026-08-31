from pydantic import BaseModel, EmailStr, Field, model_validator


class LoginIn(BaseModel):
    email: EmailStr
    senha: str


class RegistroClienteIn(BaseModel):
    nome: str = Field(min_length=1, max_length=120)
    email: EmailStr
    telefone: str = Field(min_length=8, max_length=20)
    senha: str = Field(min_length=6)
    senha_confirmacao: str

    @model_validator(mode="after")
    def _senhas_conferem(self) -> "RegistroClienteIn":
        if self.senha != self.senha_confirmacao:
            raise ValueError("As senhas não coincidem")
        return self


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
