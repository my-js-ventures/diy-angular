import Scope from '../src/Scope';
import {expect} from 'code';
import sinon from 'sinon';

describe('Scope', () => {

    let $scope,
        listenerFn,
        sandbox,
        watchFn;

    beforeEach(() => {

        $scope = new Scope();
        sandbox = sinon.sandbox.create();
        listenerFn = sandbox.stub();
        watchFn = sandbox.stub();

    });

    afterEach(() => sandbox.restore());

    it('should be constructed and used as an object', () => {

        $scope.aProperty = 1;

        expect($scope.aProperty).equals(1);

    });

    describe('digest', () => {

        it('should call the listener function of a watch on first $digest', () => {

            $scope.$watch(
                () => 'watch',
                listenerFn
            );

            $scope.$digest();

            sinon.assert.calledOnce(listenerFn);

        });

        it('should call the watch function with scope as argument', () => {

            $scope.$watch(watchFn, listenerFn);

            $scope.$digest();

            sinon.assert.calledOnce(watchFn);
            sinon.assert.calledWithExactly(watchFn, $scope);

        });

        it('should call listener function when watched value changes', () => {

            $scope.someValue = 'a';
            $scope.counter = 0;

            $scope.$watch(
                scope => scope.someValue,
                (newValue, oldValue, scope) => scope.counter += 1
            );

            expect($scope.counter).equals(0);

            $scope.$digest();
            expect($scope.counter).equals(1);

            $scope.$digest();
            expect($scope.counter).equals(1);

            $scope.someValue = 'b';
            expect($scope.counter).equals(1);

            $scope.$digest();
            expect($scope.counter).equals(2);

        });

    });

});
