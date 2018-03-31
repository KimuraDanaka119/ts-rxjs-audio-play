import "./styles.css";
import "./knob.png";

import * as Rx from "rxjs/Rx";
import * as template from "!raw-loader!./template.html";
import * as $ from "jquery";

interface IEvent {
    timeStamp: number;
    pageX: number;
    pageY: number;
}

const MAX_SPEED: number = 1;
const SMOOTHING: number = 0.99;
const RELEASE: number = 0.01;

export default class Test2 implements IDisposable {

    private subscription: Rx.Subscription;

    constructor() {

        $("#content").html(template);

        let drag$: Rx.Observable<number> = this.createObservable($("#knob").get(0));
        this.subscription = drag$.subscribe((state) => {

            let angle: number = state / 100 * 360;
            $("#knob").css("-webkit-transform", `rotate(${angle}deg)`);
            $("#knob").css("transform", `rotate(${angle}deg)`);

            $("#knob-value h3").text(state);
        });
    }

    dispose(): void {
        this.subscription.unsubscribe();
    }

    /**
     * ...
     */
    private createObservable = function (this: Test2, knob: HTMLElement): Rx.Observable<number> {

        let mouseEvents$: Rx.Observable<MouseEvent> = Rx.Observable
            .fromEvent<MouseEvent>(knob, "mousemove");

        let timer$: Rx.Observable<number> = Rx.Observable
            .interval(5)
            .map(() => Rx.Scheduler.animationFrame.now())
            .withLatestFrom(mouseEvents$)
            .map<[number, MouseEvent], IEvent>((combo) => {
                return {
                    timeStamp: combo[0],
                    pageX: combo[1].pageX,
                    pageY: combo[1].pageY
                };
            })
            .pairwise<IEvent>()
            .map<IEvent[], number>((pair) => this.mouseSpeed(pair[0], pair[1]))
            .scan<number>((prev, current) => {
                return current > 0
                    ? SMOOTHING * prev + (1 - SMOOTHING) * current
                    : (1 - RELEASE) * prev;
            }, 0)
            .map<number, number>((speed) => this.normalizeSpeed(speed, MAX_SPEED));

        return timer$;
    };

    /**
     * Calculate the speed of cursor based on two subsequent mouse events
     * @param previous previous mouse event
     * @param current  current mouse event
     */
    private mouseSpeed = function (previous: IEvent, current: IEvent): number {

        let distance: number = Math.sqrt(
            Math.pow(previous.pageX - current.pageX, 2) +
            Math.pow(previous.pageY - current.pageY, 2));

        let time: number = current.timeStamp - previous.timeStamp;
        return time > 0 ? distance / time : 0;
    };

    /**
     * Normalize provided speed to a percentage of the given max speed
     * @param speed A mouse speed
     * @param maxSpeed The max speed threshold (corresponds to 100)
     */
    private normalizeSpeed = function (speed: number, maxSpeed: number): number {
        return Math.floor(Math.min(speed, maxSpeed) / maxSpeed * 100);
    };
}