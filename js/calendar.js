// Interval graph coloring algorithm, by Twal
class IntervalColoration {
  constructor (intervals) {
      this.intervals = intervals;
      this.n = this.intervals.length;
      this.computeInterferenceGraph();
      this.computePEO();
      this.computeColoration();
  }

  computeInterferenceGraph() {
      this.adj = new Array(this.n);
      for (let i = 0; i < this.n; ++i) {
          this.adj[i] = [];
      }
      for (let i = 0; i < this.n; ++i) {
          for (let j = 0; j < i; ++j) {
              let inti = this.intervals[i];
              let intj = this.intervals[j];
              if (inti[0] < intj[1] && intj[0] < inti[1]) {
                  this.adj[i].push(j);
                  this.adj[j].push(i);
              }
          }
      }
  }

  //Perfect elimination order using Maximum Cardinality Search
  //Runs in O(n^2), could be optimized in O(n log n)
  computePEO() {
      let marked = new Array(this.n);
      let nbMarkedNeighbor = new Array(this.n);
      this.perm = new Array(this.n);
      for (let i = 0; i < this.n; ++i) {
          marked[i] = false;
          nbMarkedNeighbor[i] = 0;
      }
      for (let k = this.n-1; k >= 0; --k) {
          let maxi = -1;
          for (let i = 0; i < this.n; ++i) {
              if (!marked[i] && (maxi == -1 || nbMarkedNeighbor[i] >= nbMarkedNeighbor[maxi])) {
                  maxi = i;
              }
          }
          for (let i = 0; i < this.adj[maxi].length; ++i) {
              nbMarkedNeighbor[this.adj[maxi][i]] += 1;
          }
          this.perm[maxi] = k;
          marked[maxi] = true;
      }
      // console.log(this.perm);
  }

  computeColoration() {
      this.colors = new Array(this.n);
      let isColorUsed = new Array(this.n);
      for (let i = 0; i < this.n; ++i) {
          this.colors[i] = -1;
          isColorUsed[i] = false;
      }
      for (let i = 0; i < this.n; ++i) {
          let ind = this.perm[i];
          for (let j = 0; j < this.adj[ind].length; ++j) {
              let neigh = this.adj[ind][j];
              if (this.colors[neigh] >= 0) {
                  isColorUsed[this.colors[neigh]] = true;
              }
          }
          for (let j = 0; j < this.n; ++j) {
              if (!isColorUsed[j]) {
                  this.colors[ind] = j;
                  break;
              }
          }
          for (let j = 0; j < this.adj[ind].length; ++j) {
              let neigh = this.adj[ind][j];
              if (this.colors[neigh] >= 0) {
                  isColorUsed[this.colors[neigh]] = false;
              }
          }
      }
  }
}


// Based on https://stackoverflow.com/a/15289883
function computeDateDifferenceInHours (date1, date2) {
  d1 = new Date(date1.getYear(), date1.getMonth(), date1.getDate(), date1.getHours());
  d2 = new Date(date2.getYear(), date2.getMonth(), date2.getDate(), date2.getHours());

  const msPerHour = 60 * 60 * 1000;
  return Math.abs(d2.getTime() - d1.getTime()) / msPerHour;
}



class Calendar {

  constructor (calendarParameters = {}) {
    this.containerNode = calendarParameters.containerNode !== undefined
                       ? calendarParameters.containerNode
                       : $("#cal-container");

    this.eventContainerNode = null;
    this.timeSlotsContainerNode = null;
    this.eventDetailsContainerNode = null;

    this.startDate = calendarParameters.startDate !== undefined
                   ? calendarParameters.startDate
                   : new Date();
    this.endDate = calendarParameters.endDate !== undefined
                 ? calendarParameters.endDate
                 : new Date(Date.now() + (24 * 60 * 60 * 1000));

    this.nbHoursToDisplay = 0;
    this.firstHourToDisplay = 0;
    this.endHourToDisplay = 0;

    this.events = [];

    this.onlyDisplaySubscribedEvents = calendarParameters.onlyDisplaySubscribedEvents !== undefined
                              ? calendarParameters.onlyDisplaySubscribedEvents
                              : false;
    this.groupEventsByLocation = calendarParameters.groupEventsByLocation !== undefined
                              ? calendarParameters.groupEventsByLocation
                              : true;

    this.eventDetailURLFormat = calendarParameters.eventDetailURLFormat !== undefined
                              ? calendarParameters.eventDetailURLFormat
                              : "";
    this.subscriptionURLFormat = calendarParameters.subscriptionURLFormat !== undefined
                            ? calendarParameters.subscriptionURLFormat
                            : "";
    this.csrfToken = calendarParameters.csrfToken !== undefined
                   ? calendarParameters.csrfToken
                   : "";

    // Map from locations to their CSS styles
    this.locationStyles = new Map();

    this.init();
  }

  init () {
    this.updateHoursToDisplay();

    this.createTimeSlotContainer();
    this.createEventContainer();
    this.createEventDetailsContainer();

    this.updateTimeSlotContainerGridStyle();
    this.updateEventContainerGridStyle();

    this.createTimeSlots();
    this.createEvents();

    this.createLocationStyles();
    this.applyLocationStylesAsCSS();
    this.updateEventLocationStyleID();

    //this.sortEventNodesByEndTimeAndLocation();
    this.sortEventNodesByIntervalGraphColoring();
    this.updateCalendarNodeHeight();

    this.updateEventVisibilities();
    this.initEventOverflowTooltips();
  }


  // Date change

  setStartDate (newStartDate) {
    this.startDate = newStartDate;

    this.updateHoursToDisplay();
    this.updateEventContainerGridStyle();
    this.updateTimeSlots();

    this.updateEventVisibilities();
    this.updateCalendarNodeHeight();
    this.sortEventNodesByIntervalGraphColoring();

    this.startShowingEventOverflowTooltips();
  }

  setEndDate (newEndDate) {
    this.endDate = newEndDate;

    this.updateHoursToDisplay();
    this.updateEventContainerGridStyle();
    this.updateTimeSlots();

    this.updateEventVisibilities();
    this.updateCalendarNodeHeight();
    this.sortEventNodesByIntervalGraphColoring();

    this.startShowingEventOverflowTooltips();
  }

  updateHoursToDisplay () {
    this.startHourToDisplay = this.startDate.getHours();
    this.endHourToDisplay = this.endDate.getHours();

    this.nbHoursToDisplay = Math.floor(computeDateDifferenceInHours(this.startDate, this.endDate));
  }


  // Calendar container

  updateCalendarNodeHeight () {
    // Time slot hour row
    let timeSlotHourRowHeight = $(".cal-time-slot-hour").outerHeight();

    // Event grid
    this.containerNode.css("height", "calc(100% )");

    let eventContainerHeight = this.eventContainerNode
      .css("grid-template-rows")
      .split("px ")
      .reduce((heightAccumulator, currentRowHeight) => {
        return heightAccumulator + parseInt(currentRowHeight);
      }, 0);

    this.containerNode.css("height", timeSlotHourRowHeight + eventContainerHeight);
  }


  // Time slots

  createTimeSlotContainer () {
    this.timeSlotsContainerNode = $("<div>")
      .addClass("cal-time-slot-container")
      .appendTo(this.containerNode);
  }

  createTimeSlots () {
    // Populate the container hour by hour
    let self = this;
    function getHourStringToDisplay (hour) {
      if (hour >= 10) {
        return (hour + 1) % 24;
      }
      else {
        return "&nbsp;" + (hour + 1);
      }
    }

    for (let i = 0; i < this.nbHoursToDisplay; i++) {
      let hour = (this.startHourToDisplay + i) % 24;

      // Time slot hour
      let timeSlotHourNode = $("<div>")
        .addClass("cal-time-slot-hour")
        .css({
          "grid-column-start": `${i + 1}`,
          "grid-column-end"  : "span 1",
          "grid-row-start"   : "1",
          "grid-row-end"     : "1"
        })
        .html(getHourStringToDisplay(hour))
        .prependTo(this.timeSlotsContainerNode);

      // Time slot block
      let timeSlotBlockNode = $("<div>")
        .addClass("cal-time-slot")
        .css({
          "grid-column-start": `${i + 1}`,
          "grid-column-end"  : "span 1",
          "grid-row-start"   : "2",
          "grid-row-end"     : "2"
        })
        .appendTo(this.timeSlotsContainerNode);
    }
  }

  updateTimeSlotContainerGridStyle () {
    this.timeSlotsContainerNode.css("grid-template-columns",
                                    `repeat(${this.nbHoursToDisplay}, ${100 / this.nbHoursToDisplay }%)`);
  }

  updateTimeSlots () {
    this.timeSlotsContainerNode.empty();

    this.createTimeSlots();
    this.updateTimeSlotContainerGridStyle();
  }

  getHourSlotWidth () {
    return this.timeSlotsContainerNode.width() / this.nbHoursToDisplay;
  }


  // Events

  createEventContainer () {
    this.eventContainerNode = $("<div>")
      .addClass("cal-event-container")
      .appendTo(this.containerNode);
  }

  createEvents () {
    // Move all event nodes into the event container
    let eventElements = this.containerNode.find(".cal-event");
    eventElements.appendTo(this.eventContainerNode);

    // Create event objects from them all
    for (let element of eventElements) {
      let newEvent = new Event($(element), this);
      this.events.push(newEvent);
    }
  }

  updateEventContainerGridStyle () {
    this.eventContainerNode.css("grid-template-columns",
                                `repeat(${this.nbHoursToDisplay}, ${100 / this.nbHoursToDisplay }%)`);
  }

  updateEventVisibilities () {
    for (let event of this.events) {
      event.updateVisibility();
    }
  }


  // Event details

  createEventDetailsContainer () {
    this.eventDetailsContainerNode = $("<div>")
      .addClass("cal-details-container")
      .appendTo(this.containerNode);
  }


  // Location styles

  createLocationStyles () {
    let locationIndices = new Map();
    for (let event of this.events) {
      if (! locationIndices.has(event.location)) {
        locationIndices.set(event.location, [...locationIndices.keys()].length);
      }
    }

    let nbUniqueLocations = [...locationIndices.keys()].length;

    let styleID = 0;
    for (let [location, index] of locationIndices.entries()) {
      let hue = (index / (nbUniqueLocations + 1)) * 255;
      styleID += 1;

      this.locationStyles.set(location, {
        id: styleID,

        normal: [
          `background-color: hsl(${hue}, 40%, 80%);`,
          `border-color: hsl(${hue}, 40%, 50%);`,
          `color: #000;`
        ],

        hover: [
          `background-color: hsl(${hue}, 55%, 85%);`,
          `border-color: hsl(${hue}, 45%, 55%);`,
          `color: #000;`
        ],

        subscribed: [
          `background-color: hsl(${hue}, 75%, 75%);`,
          `border-color: hsl(${hue}, 60%, 50%);`,
          `color: #000;`
        ],

        selected: [
          `background-color: hsl(${hue}, 45%, 50%);`,
          `border-color: hsl(${hue}, 40%, 35%);`,
          `color: #FFF;`
        ]
      });
    }
  }

  applyLocationStylesAsCSS () {
    let styleNode = $("<style>");
    let styleNodeContent = "";

    for (let styles of this.locationStyles.values()) {
      let normalRules = styles.normal.join("\n");
      styleNodeContent += `.cal-location-${styles.id} {${normalRules}}\n`;

      let hoverRules = styles.hover.join("\n");
      styleNodeContent += `.cal-location-${styles.id}:hover {${hoverRules}}\n`;

      let subscribedRules = styles.subscribed.join("\n");
      styleNodeContent += `.cal-location-${styles.id}.cal-event-subscribed {${subscribedRules}}\n`;

      let selectedRules = styles.selected.join("\n");
      styleNodeContent += `.cal-location-${styles.id}.cal-selected {${selectedRules}}\n`;
    }

    styleNode
      .html(styleNodeContent)
      .appendTo($("head"));
  }

  updateEventLocationStyleID () {
    for (let event of this.events) {
      let style = this.locationStyles.get(event.location);
      event.setLocationStyleID(style.id);
    }
  }


  // Event node sorting

  // The following method requires the IntervalColoration class,
  // which provides the algorithm (see interval_coloring.js)
  sortEventNodesByIntervalGraphColoring () {
    let eventGroupIterator = [this.events];

    // If required, group events by location
    if (this.groupEventsByLocation) {
      let locationsToEvents = new Map();

      for (let event of this.events) {
        let location = event.location;

        if (! locationsToEvents.has(location)) {
          locationsToEvents.set(location, [event]);
        }
        else {
          locationsToEvents
            .get(location)
            .push(event);
        }
      }

      eventGroupIterator = locationsToEvents.values();
    }

    // Assign a color to all events and a grid row to each event node,
    // by applying the interval graph coloration algorithm
    // to each subset of events with the same location
    let currentLocationFirstGridRow = 1;
    let eventsToColors = new Map();

    for (let eventsAtSameLocation of eventGroupIterator) {
      // Build intervals for each event
      let intervals = [];
      for (let event of eventsAtSameLocation) {
        intervals.push([
          event.startDate.getTime(),
          event.endDate.getTime()
        ]);
      }

      // Get the graph coloring
      let intervalGraphColors = new IntervalColoration(intervals).colors;

      // Assign a color to each event, and a grid row to each event node
      let maximumColor = 0;

      for (let i = 0; i < eventsAtSameLocation.length; i++) {
        let event = eventsAtSameLocation[i];
        let color = intervalGraphColors[i];

        eventsToColors.set(event, color);

        if (color > maximumColor) {
          maximumColor = color;
        }

        event.node.css({
          "grid-row-start": `${currentLocationFirstGridRow + color}`,
          "grid-row-end"  : `${currentLocationFirstGridRow + color}`
        });
      }

      // Update the start row of the next location
      currentLocationFirstGridRow += 1 + maximumColor;

      // Sort the events by color
      eventsAtSameLocation.sort((event1, event2) => {
        return eventsToColors.get(event1) - eventsToColors.get(event2);
      });
    }

    // Finally sort all event nodes (by (1) location and (2) color)
    // Note: the container is detached from the DOM for better performances
    this.eventContainerNode.detach();

    for (let eventsAtSameLocation of eventGroupIterator) {
      for (let event of eventsAtSameLocation) {
        this.eventContainerNode.prepend(event.node);
      }
    }

    this.eventContainerNode.appendTo(this.containerNode);
  }

  /*
  sortEventNodesByEndTimeAndLocation () {
    this.events.sort((event1, event2) => {
      return event2.endDate.getTime() - event1.endDate.getTime();
    });

    this.events.sort((event1, event2) => {
      return event2.location.localeCompare(event1.location);
    });

    this.eventContainerNode.detach();

    for (let event of this.events) {
      event.node.prependTo(this.eventContainerNode);
    }

    this.eventContainerNode.appendTo(this.containerNode);
  }
  */


  // Event overflow tooltip (using tipso library)

  initEventOverflowTooltips () {
    $(".cal-has-tooltip").tipso({
      speed: 0,
      delay: 20,
      size: "cal_small",
      background: "#000"
    });
  }


  // Event filtering

  showEventsNotSubscribedByUser () {
    this.onlyDisplaySubscribedEvents = false;

    this.updateEventVisibilities();
    this.updateCalendarNodeHeight();
  }

  hideEventsNotSubscribedByUser () {
    this.onlyDisplaySubscribedEvents = true;

    this.updateEventVisibilities();
    this.updateCalendarNodeHeight();
  }

  toggleEventsNotSubscribedByUser () {
    if (this.onlyDisplaySubscribedEvents) {
      this.showEventsNotSubscribedByUser();
    }
    else {
      this.hideEventsNotSubscribedByUser();
    }
  }
}






class Event {

  constructor (eventNode, calendar) {
    this.node = eventNode;

    this.calendar = calendar;
    this.details = null;

    this.detailsNodeRemovalTimer = null;

    this.id = null;
    this.name = null;
    this.startDate = null;
    this.endDate = null;
    this.location = null;
    this.description = null;
    this.hasPerms = false;
    this.nbPerms = null;
    this.minNbPerms = null;
    this.maxNbPerms = null;
    this.subscribedByUser = false;
    this.tags = [];

    this.displayed = false;
    this.selected = false;

    this.locationStyleID = 0;

    // TODO: move this elsewhere
    // Callback to display the details popup on click on the event node
    this.showDetailPopupOnClickCallback = (event) => {
      if ($(event.target).closest(".cal-event-details").length === 0) {
        this.details.showPopup(event);
      }
    };

    this.init();
  }

  init () {
    this.parseAndSetID();
    this.parseAndSetName();
    this.parseAndSetDates();
    this.parseAndSetLocation();
    this.parseAndSetDescription();
    this.parseAndSetPermRelatedFields();
    this.parseAndSetTags();

    this.addPermCounter();
    this.updateOverflowTooltipContent();

    this.createDetails();

    this.updateVisibility();
  }


  // Event data parsers + setters

  parseAndSetID () {
    this.id = this.node.find(".cal-event-id").text();
  }

  parseAndSetName () {
    this.name = this.node.find(".cal-event-name").text();
  }

  parseDate (dateString) {
    let regex = /(\d+)\/(\d+)\/(\d+) (\d+)\:(\d+)/g;
    let [day, month, year, hours, minutes] = regex
      .exec(dateString)
      .slice(1)
      .map((intString) => {
        return parseInt(intString);
      });

    return new Date(year,
                    month - 1,
                    day,
                    hours,
                    minutes);
  }

  parseAndSetStartDate () {
    let startDateString = this.node.find(".cal-event-start-date").text();
    let startDate = this.parseDate(startDateString);
    this.startDate = startDate;
  }

  parseAndSetEndDate () {
    let endDateString = this.node.find(".cal-event-end-date").text();
    let endDate = this.parseDate(endDateString);
    this.endDate = endDate;
  }

  parseAndSetDates () {
    this.parseAndSetStartDate();
    this.parseAndSetEndDate();
  }

  parseAndSetLocation () {
    this.location = this.node.find(".cal-event-location").text();
  }

  parseAndSetDescription () {
    this.description = this.node.find(".cal-event-description").html();
  }

  parseAndSetPermRelatedFields () {
    let hasPerms = !! parseInt(this.node.find(".cal-event-has-perms").text());

    if (hasPerms) {
      this.hasPerms = true;

      this.nbPerms = parseInt(this.node.find(".cal-event-nb-perms").text());

      this.minNbPerms = parseInt(this.node.find(".cal-event-min-nb-perms").text());
      this.maxNbPerms = parseInt(this.node.find(".cal-event-max-nb-perms").text());

      this.subscribedByUser = !! parseInt(this.node.find(".cal-event-subscribed").text());
    }
  }

  parseAndSetTags () {
    this.node.find(".cal-event-tag")
      .each((_, element) => {
        this.tags.push(element.innerText);
      });
  }


  // Event details

  createDetails () {
    this.details = new EventDetails(this);
  }

  startDisplayingDetailsPopupOnClick () {
    this.node.on("click", this.showDetailPopupOnClickCallback);
  }

  stopDisplayingDetailsPopupOnClick () {
    this.node.off("click", this.showDetailPopupOnClickCallback);
  }


  // Event node content

  addPermCounter () {
    if (! this.hasPerms) {
      return;
    }

    let permCounterNode = $("<div>")
      .addClass("cal-event-perm-count")
      .appendTo(this.node);

    this.updatePermCounter();
  }

  updatePermCounter () {
    let permCounterNode = this.node.find(".cal-event-perm-count")
      .html(`<span>&#x1f464; ${this.nbPerms}/${this.maxNbPerms}</span>`);

    if (this.minNbPerms > this.nbPerms) {
      permCounterNode.addClass("cal-perms-missing");
    }
    else {
      permCounterNode.removeClass("cal-perms-missing");
    }
  }


  // Grid position

  // Assuming the events can appear in the calendar
  getGridStartColumn () {
    if (this.startDate.getTime() < this.calendar.startDate.getTime()) {
      return 1;
    }

    return 1 + Math.floor(computeDateDifferenceInHours(this.calendar.startDate, this.startDate));
  }

  // Assuming the events can appear in the calendar
  getGridEndColumn () {
    if (this.endDate.getTime() > this.calendar.endDate.getTime()) {
      return 1 + this.calendar.nbHoursToDisplay;
    }

    let shiftedEndDate = new Date(this.endDate.getTime() + 1000 * 60 * 59);

    return 1 + this.calendar.nbHoursToDisplay
             - Math.ceil(computeDateDifferenceInHours(shiftedEndDate, this.calendar.endDate));
  }

  updatePositionInGrid () {
    // Align on the grid according to the hours
    this.node.css({
      "grid-column-start": `${this.getGridStartColumn()}`,
      "grid-column-end"  : `${this.getGridEndColumn()}`
    });

    // Add left and right padding according to the minutes
    let columnWidth = this.calendar.getHourSlotWidth();

    let startMinutes = this.startDate.getMinutes();
    let endMinutes = this.endDate.getMinutes();

    let marginLeft = 0;
    if (this.startDate.getTime() >= this.calendar.startDate.getTime()
    && startMinutes !== 0) {
      marginLeft = columnWidth * (startMinutes / 60);
    }

    let marginRight = 0;
    if (this.endDate.getTime() <= this.calendar.endDate.getTime()
    && endMinutes !== 0) {
      marginRight = columnWidth * ((60 - endMinutes) / 60);
    }

    this.node.css({
      "margin-left" : marginLeft,
      "margin-right": marginRight
    });
  }


  // Event style

  updateNodeStyle () {
    if (this.subscribedByUser) {
      this.node.addClass("cal-event-subscribed");
    }
    else {
      this.node.removeClass("cal-event-subscribed");
    }
  }



  // Location style

  setLocationStyleID (styleID) {
    this.locationStyleID = styleID;
    this.node.addClass(`cal-location-${styleID}`);
  }


  // Selection

  select () {
    this.selected = true;
    this.node.addClass("cal-selected");
  }

  deselect () {
    this.selected = false;
    this.node.removeClass("cal-selected");
  }


  // Visibility

  hide () {
    this.stopDisplayingDetailsPopupOnClick();

    this.node.hide();
    this.displayed = false;
  }

  show () {
    this.node.show();

    this.updateNodeStyle();
    this.updatePositionInGrid();
    this.updateOverflowTooltipTriggering();
    this.startDisplayingDetailsPopupOnClick();

    this.displayed = true;
  }

  updateVisibility () {
    // If required, hide events which are not subscribed by the current user
    if (this.calendar.onlyDisplaySubscribedEvents
    &&  ! this.subscribedByUser) {
      this.hide();
      return;
    }

    // Hide events which cannot apear in the calendar time span
    if (this.calendar.startDate.getTime() >= this.endDate.getTime()
    ||  this.calendar.endDate.getTime()   <= this.startDate.getTime()) {
      this.hide();
      return;
    }

    // Otherwise, show the current event
    this.show();
  }


  // Overflow tooltip (using tipso library)

  updateOverflowTooltipContent () {
    this.node.find(".cal-event-name")
      .attr("data-tipso-titleContent", this.name)
      .attr("data-tipso-content", this.location);

    this.node.find(".cal-event-location")
      .attr("data-tipso-titleContent", this.name)
      .attr("data-tipso-content", this.location);
  }

  updateOverflowTooltipTriggering () {
    let eventNameNode = this.node.find(".cal-event-name");
    let eventLocationNode = this.node.find(".cal-event-location");

    let eventNameElement = eventNameNode[0];
    let eventLocationElement = eventLocationNode[0];

    if ((eventNameElement !== undefined && eventNameElement.clientWidth < eventNameElement.scrollWidth)
    ||  (eventLocationElement !== undefined && eventLocationElement.clientWidth < eventLocationElement.scrollWidth)) {
        eventNameNode.addClass("cal-has-tooltip");
        eventLocationNode.addClass("cal-has-tooltip");
    }
    else {
      eventNameNode.removeClass("cal-has-tooltip");
      eventLocationNode.removeClass("cal-has-tooltip");

    }
  }
}






class EventDetails {

  constructor (event) {
    this.event = event;
    this.node = null;

    // TODO: move this elsewhere
    // Callback to close the details popup on click outside the popup
    this.closePopupOnClickOutsideCallback = (event) => {
      if ($(event.target).closest(".cal-event-details").length === 0) {
        this.hidePopup();
      }
    };

    this.init();
  }


  init () {
    // Create the container node
    this.node = $("<div>")
      .addClass("cal-event-details")
      .appendTo(this.event.calendar.eventDetailsContainerNode)
      .hide();

    this.createAndAppendTitle();
    this.createAndAppendCloseButton();

    // Table of (label, value) details
    let tableNode = $("<table>")
      .appendTo(this.node);

    function addRowToDetailTable (label, value) {
      let rowNode = $("<tr>")
        .addClass("cal-detail-list")
        .appendTo(tableNode);

      $("<td>")
        .addClass("cal-detail-label")
        .html(label)
        .appendTo(rowNode);

      $("<td>")
        .addClass("cal-detail-value")
        .html(value)
        .appendTo(rowNode);
    }

    this.createAndAppendLocation(addRowToDetailTable);
    this.createAndAppendStartDate(addRowToDetailTable);
    this.createAndAppendEndDate(addRowToDetailTable);
    this.createAndAppendDuration(addRowToDetailTable);

    this.createAndAppendPermManagementArea();

    this.createAndAppendDescription();
    this.createAndAppendTags();
  }


  createAndAppendCloseButton () {
    $("<button>")
      .attr("type", "button")
      .addClass("cal-detail-close-button")
      .html("&#x2715;") // cancelation cross
      .appendTo(this.node)
      .on("click", (event) => {
        this.hidePopup();
      });
  }

  createAndAppendTitle () {
    let eventDetailURL = this.event.calendar.eventDetailURLFormat
      .replace("999999", this.event.id);

    let linkToEventPageNode = $("<a>")
      .attr("href", eventDetailURL)
      .attr("target", "_blank")
      .addClass("cal-detail-name")
      .appendTo(this.node);

    $("<h3>")
      .html(this.event.name)
      .appendTo(linkToEventPageNode);
  }

  createAndAppendLocation (addRowToDetailTable) {
    addRowToDetailTable("Lieu", this.event.location);
  }

  createAndAppendStartDate (addRowToDetailTable) {
    let startDateString = this.event.startDate
      .toLocaleDateString("fr-FR", {year: "2-digit", month: "2-digit", day: "2-digit"});
    let startTimeString = this.event.startDate
      .toLocaleDateString("fr-FR", {hour: "2-digit", minute: "2-digit"})
      .slice(-5);

    addRowToDetailTable("Début", `Le ${startDateString} à ${startTimeString}`);
  }

  createAndAppendEndDate (addRowToDetailTable) {
    let endDateString = this.event.endDate
      .toLocaleDateString("fr-FR", {year: "2-digit", month: "2-digit", day: "2-digit"});
    let endTimeString = this.event.endDate
      .toLocaleDateString("fr-FR", {hour: "2-digit", minute: "2-digit"})
      .slice(-5);

    addRowToDetailTable("Fin", `Le ${endDateString} à ${endTimeString}`);
  }

  createAndAppendDuration (addRowToDetailTable) {
    const msPerMinute = 60 * 1000;
    const msPerHour = 60 * msPerMinute;

    let durationInMs = Math.abs(this.event.startDate.getTime() - this.event.endDate.getTime());

    let hours = Math.floor(durationInMs / msPerHour);
    let minutes = Math.abs((durationInMs % msPerHour) / msPerMinute);

    addRowToDetailTable("Durée", hours !== 0
                               ? (minutes !== 0 ? `${hours}h ${minutes}min` : `${hours}h`)
                               : `${minutes}min`);
  }

  createAndAppendPermManagementArea () {
    if (! this.event.hasPerms) {
      return;
    }

    let permAreaNode = $("<div>")
      .addClass("cal-detail-perm-area")
      .appendTo(this.node);

    let permTitleNode = this.createPermManagementTitle()
      .appendTo(permAreaNode);

    let permCountNode = this.createPermManagementCounter()
      .appendTo(permAreaNode);

    let permSubscribeButtonNode = this.createPermManagementSwitchButton()
      .appendTo(permAreaNode);

      this.updatePermManagementArea();
  }

  updatePermManagementArea () {
    let permAreaNode = this.node.find(".cal-detail-perm-area");

    this.updatePermManagementCounter();
    this.updatePermManagementSwitchButton();

    // Additional warning message if there are too little perms,
    // and if the user has not subscribed to this event
    permAreaNode
      .find(".cal-detail-perm-nb-missing-perms")
      .remove();

    if (! this.event.subscribedByUser
    &&  this.event.minNbPerms > this.event.nbPerms) {
      let nbMissingPerms = this.event.minNbPerms - this.event.nbPerms;
      let optionnalPluralMark = nbMissingPerms > 1 ? "s" : "";

      $("<p>")
        .addClass("cal-detail-perm-nb-missing-perms")
        .html(`${nbMissingPerms} personne${optionnalPluralMark}</br>min. manquante${optionnalPluralMark} !`)
        .appendTo(permAreaNode);
    }
  }

  createPermManagementTitle () {
    return $("<h4>")
      .addClass("cal-detail-perm-title")
      .html("Permanences");
  }

  createPermManagementCounter () {
    return $("<span>")
      .addClass("cal-detail-perm-count")
      .html(`&#x1f464; ${this.event.nbPerms}/${this.event.maxNbPerms}`);
  }

  updatePermManagementCounter () {
    let permCounterNode = this.node
      .find(".cal-detail-perm-count")
      .html(`&#x1f464; ${this.event.nbPerms}/${this.event.maxNbPerms}`);

    if (this.event.minNbPerms > this.event.nbPerms) {
      permCounterNode.addClass("cal-perms-missing");
    }
    else if (this.event.nbPerms === this.event.maxNbPerms) {
      permCounterNode.addClass("cal-perms-full");
    }
  }

  createPermManagementSwitchButton () {
    let buttonNode = $("<button>")
      .addClass("cal-detail-perm-subscription-switch");

    // On click, switch the subscription state
    // and update objects related to the perm count
    let event = this.event;

    buttonNode.on("click", () => {
      let goal = event.subscribedByUser ? "unenrol" : "enrol";
      let url = event.calendar.subscriptionURLFormat
        .replace("999999", event.id);

      $.ajax(url, {
        method: "POST",
        dataType: "json",

        headers: {
          "X-CSRFToken": event.calendar.csrfToken
        },

        data: {
          "goal": goal
        },

        success: (jsonAnswer) => {
          event.subscribedByUser = jsonAnswer.enrolled;
          event.nbPerms = jsonAnswer.number;

          this.updatePermManagementArea();
          event.updatePermCounter();
          event.updateNodeStyle();
          event.updateOverflowTooltipContent();
        },

        error: () => {
          alert("Erreur lors de l'inscription ou de la désinscription à cette permanence.");
        }
      });
    });

    return buttonNode;
  }

  updatePermManagementSwitchButton () {
    let event = this.event;
    let buttonNode = this.node.find(".cal-detail-perm-subscription-switch");

    // Reset the button state
    buttonNode.prop("disabled", false);

    // Update its content and state
    if (event.subscribedByUser) {
      buttonNode.html("Se dÃ©sinscrire");
    }
    else {
      buttonNode.html("S'inscrire");

      // Disable the button if the maximum number of perms is already reached
      if (event.nbPerms === event.maxNbPerms) {
        buttonNode.prop("disabled", true);
      }
    }
  }

  createAndAppendDescription () {
    $("<p>")
      .addClass("cal-detail-description")
      .html(this.event.description)
      .appendTo(this.node);
  }

  createAndAppendTags () {
    let tagContainerNode = $("<div>")
      .addClass("cal-detail-tag-list")
      .appendTo(this.node);

    for (let tag of this.event.tags) {
      $("<span>")
        .addClass("cal-detail-tag")
        .html(tag)
        .appendTo(tagContainerNode);
    }
  }

  setPopupPosition (mouseClickEvent) {
    let calendarOffset = this.event.calendar.containerNode.offset();

    let eventOffset = this.event.node.position();
    let eventNodeHeight = this.event.node.outerHeight();

    let detailNodeOffset = this.node.position();
    let detailsNodeWidth = this.node.outerWidth();
    let detailsNodeHeight = this.node.outerHeight();

    let x = mouseClickEvent.pageX - (detailsNodeWidth / 2)
                                  - calendarOffset.left;
    let y = eventOffset.top + eventNodeHeight + 50;

    // If the popup is too high to vertically fit in the window,
    // it is displayed above the event instead
    // let bottomMargin = 50; // px
    // let detailsNodeBottom = y
    //                       + calendarOffset.top
    //                       + detailsNodeHeight;

    // if (detailsNodeBottom > $(window).height() - bottomMargin) {
    //   y = eventOffset.top - detailsNodeHeight - 10;
    //   this.node.addClass("above-event")
    // }

    // If the popup is about to be displayed outside of
    // the left/right side of the screen, correct its future x position
    let absoluteX = x + calendarOffset.left;
    let sideMargin = 20; // px

    if (absoluteX < sideMargin) {
      x += sideMargin - absoluteX;
    }
    else if (absoluteX + detailsNodeWidth > $(window).width() - sideMargin) {
      x -= (absoluteX + detailsNodeWidth) - ($(window).width() - sideMargin);
    }

    this.node.css({
      "left": x,
      "top": y
    });
  }

  showPopup (mouseClickEvent) {
    if (this.node.is(":visible")) {
      return;
    }

    this.event.select();

    this.node.show();
    this.setPopupPosition(mouseClickEvent);

    // TODO: use a clean solution ;)
    window.setTimeout(() => {
        this.startHidingOnOutsideClick();
    }, 20);
  }

  hidePopup () {
    this.event.deselect();

    this.stopHidingOnOutsideClick();
    this.node.hide();
  }

  // TODO: define the callback elsewhere

  startHidingOnOutsideClick () {
    $(document).on("click", this.closePopupOnClickOutsideCallback);
  }

  stopHidingOnOutsideClick () {
    $(document).off("click", this.closePopupOnClickOutsideCallback);
  }
}
