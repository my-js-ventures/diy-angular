import {cloneDeep, forEachRight, isEqual} from 'lodash';
import literals from './literals';
import {log} from './logger';

const $$applyAsyncId = new WeakMap();
const $$applyAsyncQueue = new WeakMap();
const $$evalAsyncQueue = new WeakMap();
const $$initialWatchValue = Symbol.for('$$initialWatchValue');
const $$lastDirtyWatch = new WeakMap();
const $$phase = new WeakMap();
const $$watchers = new WeakMap();

export default class Scope {

    get $$phase() {

        return $$phase.get(this);

    }

    static $$areEqual(newValue, oldValue, compareValues) {

        return compareValues ?
               isEqual(newValue, oldValue) :
               newValue === oldValue || Scope.testNaN(newValue, oldValue);

    }

    static $$beginPhase($scope, phase) {

        if ($scope.$$phase) {

            throw new Error(`${$scope.$$phase} ${literals.PHASE_ALREADY_IN_PROGRESS}`);

        }

        $$phase.set($scope, phase);

    }

    static $$clearPhase($scope) {

        $$phase.set($scope, null);

    }

    static $$digestOnce($scope) {

        let dirty = false;

        forEachRight($$watchers.get($scope), watcher => { // eslint-disable-line complexity

            if (!watcher) {

                return true;

            }

            try {

                const {compareValues} = watcher;
                const newValue = watcher.watchFn($scope);
                const oldValue = watcher.last;

                if (!Scope.$$areEqual(newValue, oldValue, compareValues)) {

                    $$lastDirtyWatch.set($scope, watcher);

                    watcher.last = Scope.copyValue(newValue, compareValues);
                    watcher.listenerFn(
                        newValue,
                        Scope.getOldValue(newValue, oldValue),
                        $scope
                    );

                    dirty = true;

                } else if ($$lastDirtyWatch.get($scope) === watcher) {

                    return false;

                }

            } catch (error) {

                log('error', error);

            }

            return true;

        });

        return dirty;

    }

    static $$flushApplyAsync($scope) {

        const applyAsyncId = $$applyAsyncId.get($scope);

        if (applyAsyncId) {

            clearTimeout(applyAsyncId);

            Scope.executeApplyQueue($scope);

        }

    }

    static $$flushEvalAsync($scope) {

        const asyncQueue = $$evalAsyncQueue.get($scope);

        while (asyncQueue.length) {

            const asyncTask = asyncQueue.shift();

            asyncTask.scope.$eval(asyncTask.evalFn, ...asyncTask.args);

        }

    }

    static checkForInfiniteDigestion($scope, dirty, iterations) {

        if (dirty && !iterations) {

            Scope.$$clearPhase($scope);

            throw new Error(literals.INFINITE_DIGESTION);

        }

    }

    static copyValue(value, shouldClone) {

        return shouldClone ? cloneDeep(value) : value;

    }

    static executeApplyQueue($scope) {

        const applyAsyncQueue = $$applyAsyncQueue.get($scope);

        while (applyAsyncQueue.length) {

            applyAsyncQueue.shift()();

        }

        $$applyAsyncId.set($scope, null);

    }

    static getOldValue(newValue, oldValue) {

        return oldValue === $$initialWatchValue ? newValue : oldValue;

    }

    static testNaN(newValue, oldValue) {

        return [
            () => typeof newValue === 'number',
            () => typeof oldValue === 'number',
            () => isNaN(newValue),
            () => isNaN(oldValue)
        ].every(condition => condition());

    }

    constructor() {

        $$applyAsyncId.set(this, null);
        $$applyAsyncQueue.set(this, []);
        $$evalAsyncQueue.set(this, []);
        $$lastDirtyWatch.set(this, null);
        $$watchers.set(this, []);

        Scope.$$clearPhase(this);

    }

    $apply(...args) {

        try {

            Scope.$$beginPhase(this, '$apply');

            this.$eval(...args);

        } finally {

            Scope.$$clearPhase(this);

            this.$digest();

        }

    }

    $applyAsync(...args) {

        const applyAsyncQueue = $$applyAsyncQueue.get(this);

        applyAsyncQueue.push(() => this.$eval(...args));

        if ($$applyAsyncId.get(this) === null) {

            $$applyAsyncId.set(
                this,
                setTimeout(
                    () => this.$apply(
                        () => Scope.executeApplyQueue(this)
                    )
                )
            );

        }

    }

    $eval(evalFn, ...args) {

        return evalFn(this, ...args);

    }

    $evalAsync(evalFn, ...args) {

        const asyncQueue = $$evalAsyncQueue.get(this);

        if (!this.$$phase && !asyncQueue.length) {

            setTimeout(() => {

                if (asyncQueue.length) {

                    this.$digest();

                }

            });

        }

        asyncQueue.push({
            args,
            evalFn,
            scope: this
        });

    }

    $digest() {

        let dirty = false,
            iterations = 10;

        Scope.$$beginPhase(this, '$digest');

        $$lastDirtyWatch.set(this, null);

        Scope.$$flushApplyAsync(this);

        do {

            Scope.$$flushEvalAsync(this);

            dirty = Scope.$$digestOnce(this) || $$evalAsyncQueue.get(this).length;

            Scope.checkForInfiniteDigestion(this, dirty, iterations);

            iterations -= 1;

        } while (dirty);

        Scope.$$clearPhase(this);

    }

    $watch(watchFn, listenerFn = (() => {}), compareValues = false) {

        const watcher = {
            compareValues,
            last: $$initialWatchValue,
            listenerFn,
            watchFn
        };

        $$watchers.get(this).unshift(watcher);
        $$lastDirtyWatch.set(this, null);

        return () => {

            const index = $$watchers.get(this).indexOf(watcher);

            if (index >= 0) {

                $$watchers.get(this).splice(index, 1);
                $$lastDirtyWatch.set(this, null);

            }

        };

    }

}
