export function PasswordRequirements() {
  return <p id="password-requirements" className="text-xs leading-relaxed text-muted-foreground">
    Не менее 6 символов. Обязательных букв, цифр или специальных символов нет.
    Слишком распространённые пароли и пароли из утечек могут быть отклонены.
  </p>;
}