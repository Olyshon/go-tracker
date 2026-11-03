# Go Tracker Olga

Create a responsive personal monthly productivity and habit tracker web app.

The interface language must be Russian.

The app should visually resemble a clean elegant paper planner, but feel like a modern web application.

Overall visual style

Use:

warm off-white / ivory background

muted olive-beige accent colors

very light gray borders

dark gray text instead of pure black

subtle rounded corners

minimal shadows

calm, elegant, uncluttered design

desktop-first layout, but responsive

Avoid:

bright colors

gradients

heavy shadows

oversized cards

overly modern SaaS dashboard aesthetics

The design should feel like a premium digital planner.

Main page layout

Create a monthly dashboard.

1. Month header

In the upper-left area display:

"Планер GO"

Below it display the current month prominently:

"Январь"

Add left and right arrow buttons near the month so the user can switch between months.

Also show the year.

Example:

Планер GO
‹ Январь 2026 ›

2. Monthly goals

On the left side below the month header create a section:

"Цели месяца"

Display up to 8 goals.

Each goal has:

number

goal title

checkbox

Example:

Достичь дзен

Вести финансовый учёт

Планирование каждого воскресенья

Завершить проект

Защитить таблицу

Убрать тревожность

Allow the user to:

add a goal

edit a goal

delete a goal

mark it as completed

3. KPI progress indicators

Across the upper part of the dashboard create three compact progress blocks:

"Выполненные цели"

"Выполненные привычки"

"Общий прогресс"

Each block should show:

numeric value

horizontal progress bar

percentage

Keep them slim and elegant, similar to progress indicators in a paper planner.

4. Productivity chart

Create a wide chart titled:

"Прогресс продуктивности"

X-axis:
days of the current month

Y-axis:
percentage of habits completed on that day

Use a smooth area or line chart with a very subtle muted green fill.

The chart should automatically update when habit checkboxes are changed.

5. Overall monthly progress

To the right of the productivity chart create a donut chart.

In the center display the overall monthly completion percentage.

Example:

54%

Use muted olive/beige for completed progress and very light gray for the remaining area.

6. Habit tracker

This is the main section of the page.

Title:

"Трекер продуктивности"

Create a large table.

Rows = habits.

Columns = calendar days of the selected month.

For every day show:

abbreviated Russian weekday

date number

Example:

чт
1

пт
2

сб
3

вс
4

etc.

Group days visually by week using slightly stronger vertical separators.

The first column must remain sticky when horizontally scrolling.

Example habits:

Подъём в 7:30 ⏰
Пробежка 🏃
Контрастный душ 🚿
Завтрак 🥣
Спортзал 💪
Работа над проектом 🎯
Отказ от соцсетей 📱
Ведение бюджета 💰
Чтение / Обучение 📚
Планирование недели 📅
Медитация 🧘
Ложиться спать до 22:00 🛏️

Every day cell should contain a checkbox-style control.

Clicking the cell toggles the habit between:
completed
not completed

Completed cells should use the muted olive accent.

Future dates in the current month should appear visually inactive.

Highlight today's date subtly.

Weekend columns may have a slightly different background.

7. Habit progress

At the right side of each habit row show:

number of completed days

horizontal mini progress bar

completion percentage

Example:

22 ███████░░░ 71%

Calculate these automatically.

8. Habit management

Add a small button:

"+ Добавить привычку"

Allow:

creating habits

renaming habits

deleting habits

adding an emoji/icon

Do not make habit management visually dominant.

9. Calculations

Automatically calculate:

Daily productivity =
completed habits that day / active habits × 100

Habit progress =
completed days / available days × 100

Completed goals =
number of completed monthly goals / total monthly goals

Overall progress =
average of habit completion percentage and goal completion percentage

10. Data persistence

For the first version, store all data locally in the browser using localStorage.

The user's checked habits, goals and habit names must remain after refreshing the page.

Store data separately for each month and year.

11. Responsive behavior

Desktop:
show the complete dashboard.

Tablet:
allow horizontal scrolling for the habit table.

Mobile:
do not squeeze the entire 31-day table into the screen.

Instead create a usable mobile layout where the user can horizontally scroll the calendar while habit names remain visible.

Important

Focus first on creating a polished functional MVP.

Do not add:

login

user accounts

social features

gamification

notifications

AI functionality

backend database

We will add those later.

Make all buttons and interactions functional, not just visual placeholders.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://go-tracker-olga.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8a1b952f-c7a9-41f5-aa23-227f776ab5e7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
