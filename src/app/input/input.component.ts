import { Component, HostListener, OnInit } from '@angular/core';
import {
  CalendarOptions,
  EventInput,
} from '@fullcalendar/core';

import timeGridPlugin from '@fullcalendar/timegrid';

import { faChevronLeft, faChevronRight, faCalendar, faPaperPlane } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-input',
  templateUrl: './input.component.html',
  styleUrls: ['./input.component.scss'],
})
export class InputComponent implements OnInit {
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;
  faCalendar = faCalendar;
  faPaperPlane = faPaperPlane;
  text: any;
  criticalSchedule: EventInput[] = [];
  possibleSchedules: EventInput[][] = [];

  selectedSchedule: any;

  calendarOptions: CalendarOptions = {
    plugins: [timeGridPlugin],
    initialView: 'timeGridWeek',
    weekends: false,
    events: [],
    slotMinTime: '08:00:00',
    slotMaxTime: '20:00:00',
    headerToolbar: false,
    allDaySlot: false,
    dayHeaderFormat: {weekday: 'long'},
    locale: 'fr',
  };

  constructor() {}

  ngOnInit(): void {}

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key == 'ArrowLeft') {
      this.previousSchedule();
    } else if (event.key == 'ArrowRight') {
      this.nextSchedule();
    }
  }

  previousSchedule() {
    this.selectedSchedule = this.possibleSchedules[
      this.possibleSchedules.indexOf(this.selectedSchedule) - 1 < 0 ? 0 : this.possibleSchedules.indexOf(this.selectedSchedule) - 1
    ];
    this.updateCalendar();
  }

  nextSchedule() {
    this.selectedSchedule = this.possibleSchedules[
      this.possibleSchedules.indexOf(this.selectedSchedule) + 1 > this.possibleSchedules.length - 1 ? this.possibleSchedules.length - 1 : this.possibleSchedules.indexOf(this.selectedSchedule) + 1
    ];
    this.updateCalendar();
  }

  generate(text: string) {
    this.calendarOptions.events = [];
    this.criticalSchedule = [];
    this.possibleSchedules = [];

    // first break the text into lines
    let lines = text.split('\n');

    for (let index = 0; index < lines.length; index++) {
      let title = lines[index].substring(
        0,
        this.getPosition(lines[index], '\t', 1)
      );
      if (title.substring(0, 4) == 'TX00') {
        continue;
      }
      let startDay: string = lines[index].substring(
        this.getPosition(lines[index], '\t', 1) + 1,
        this.getPosition(lines[index], '\t', 2)
      );

      let startHour: string = lines[index].substring(
        this.getPosition(lines[index], '\t', 2) + 1,
        this.getPosition(lines[index], '\t', 2) + 6
      );

      let endHour: string = lines[index].substring(
        this.getPosition(lines[index], '\t', 3) + 1,
        this.getPosition(lines[index], '\t', 3) + 6
      );

      let start: Date = this.getDate(startDay);
      start.setHours(parseInt(startHour.substring(0, 2)));
      start.setMinutes(parseInt(startHour.substring(3, 5)));

      let end: Date = this.getDate(startDay);
      end.setHours(parseInt(endHour.substring(0, 2)));
      end.setMinutes(parseInt(endHour.substring(3, 5)));

      let event = { title: title, start: start, end: end };
      // this.calendarOptions.events.push(event);
      this.criticalSchedule.push(event);
    }

    this.possibleSchedules = this.getPossibleSchedules(this.criticalSchedule);
    this.selectedSchedule = this.possibleSchedules[0];
    this.updateCalendar();
  }

  updateCalendar() {
    this.calendarOptions.events = this.selectedSchedule;
  }

  getPosition(str: string, subString: string, index: number) {
    return str.split(subString, index + 1).join(subString).length;
  }

  getFirstDayOfWeek(d: Date) {
    // 👇️ clone date object, so we don't mutate it
    const date = new Date(d);
    const day = date.getDay(); // 👉️ get day of week

    // 👇️ day of month - day of week (-6 if Sunday), otherwise +1
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);

    return new Date(date.setDate(diff));
  }

  getNthDayOfWeek(d: Date, n: number) {
    // use getFirstDayOfWeek() to get the first day of the week
    const firstDay = this.getFirstDayOfWeek(d);

    // 👇️ add n days to the first day of the week
    return new Date(firstDay.setDate(firstDay.getDate() + n));
  }

  getDate(str: string): Date {
    const today = new Date();
    switch (str) {
      case 'Lundi':
        return this.getFirstDayOfWeek(today);
      case 'Mardi':
        return this.getNthDayOfWeek(today, 1);
      case 'Mercredi':
        return this.getNthDayOfWeek(today, 2);
      case 'Jeudi':
        return this.getNthDayOfWeek(today, 3);
      case 'Vendredi':
        return this.getNthDayOfWeek(today, 4);
      case 'Samedi':
        return this.getNthDayOfWeek(today, 5);
    }
    return new Date();
  }

  getPossibleSchedules(events: EventInput[]): EventInput[][] {
    // cast to
    let schedules: EventInput[][] = [];
    let criticalPairs: string[] = [];

    // Quick clean up for the AI28 mess (we have two "AI28 Cours" and no TD so one of them should be the TD)
    // replace all the "AI28 Cours" with "AI28 Cours/TD"
    events.forEach((e) => {
      if (e.title?.substring(0, 4) == 'AI28') {
        e.title = 'AI28 Cours/TD';
      }
    });

    events.forEach((element) => {
      // if a title is present more than once, it is a critical pair
      if (events.filter((e) => e.title === element.title).length > 1 && element.title?.substring(0, 4) != 'AI28') {
        criticalPairs.push(element.title as string);
      }
    });

    // if there are no critical pairs, we can return the events as a schedule
    if (criticalPairs.length === 0) {
      schedules.push(events);
      return schedules;
    }

    // We find all the events that are critical pairs
    let criticalPairsEvents: { [key: string]: EventInput[] } = {};
    criticalPairs.forEach((title) => {
      criticalPairsEvents[title] = events.filter((e) => e.title === title);
    });

    // We find all the possible combinations of critical pairs
    let criticalPairsCombinations: EventInput[][] = [];
    // {AI28 Cours: [1, 2], AI04 Cours: [3, 4]} => [[1, 3], [1, 4], [2, 3], [2, 4]]
    let keys = Object.keys(criticalPairsEvents);
    let values = Object.values(criticalPairsEvents);
    let combinations = this.cartesianProductOf(...values);
    combinations.forEach((combination: string | any[]) => {
      let schedule: EventInput[] = [];
      for (let index = 0; index < combination.length; index++) {
        schedule.push({
          title: keys[index],
          start: combination[index].start,
          end: combination[index].end,
        });
      }
      criticalPairsCombinations.push(schedule);
    });

    // We add the non critical pairs to the combinations
    criticalPairsCombinations.forEach((combination) => {
      let schedule: EventInput[] = [];
      events.forEach((event) => {
        if (!criticalPairs.includes(event.title as string)) {
          schedule.push(event);
        }
      });
      schedule.push(...combination);

      // add the schedule only if there are no events that have the same starting time
      let isScheduleValid = true;
      schedule.forEach((event) => {
        // if event start time is present more than once, it is not a valid schedule
        if ( schedule.filter((e) => Date.parse(e.start as string) === Date.parse(event.start as string)).length > 1) {
          isScheduleValid = false;
        }
      });
      if (isScheduleValid) {
        schedules.push(schedule);
      }
    });

    return schedules;
  }

  cartesianProductOf(...arrays: any[]) {
    return arrays.reduce(
      (a, b) => a.flatMap((d: any) => b.map((e: any) => [d, e].flat())),
      [[]]
    );
  }
}
