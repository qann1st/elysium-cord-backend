# Для запуска приложения выполнить следующие шаги

## Установить пакеты
```sh 
pnpm i
```

## Заполнить .env
```config
DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/mydatabase?schema=public"
MAIL_PASSWORD="___"
JWT_ACCESS_SECRET="fsdjfudisfhdusfuidshuifhdsuifhudsihfguisdopghauoihguiodfashguiohasdfuighuasdguoihusdiaoghuasido"
JWT_REFRESH_SECRET="fdsfdsfsdjfudisfhdusfuidshuifhdsuifhudsihfguisdopghauoihguiodfashguiohasdfuighuasdguoihusdiaoghuasido"
```

## Установить зависимости для mediasoup
https://mediasoup.org/documentation/v3/mediasoup/installation/