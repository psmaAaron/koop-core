/* eslint handle-callback-err: "off" */
const should = require('should') // eslint-disable-line
const sinon = require('sinon')
require('should-sinon')
const _ = require('lodash')
const providerMock = require('./fixtures/fake-provider')
const ExtendedModel = require('../src/models/extended-model')
const koopMock = { test: 'value' }

describe('Tests for models/index', function () {
  describe('createKey', function () {
    it('should create cache-key as provider name', () => {
      const retrieveSpy = sinon.spy(function (key, queryParams, callback) {
        callback(null, {})
      })
      const pullSpy = sinon.spy()

      // create a model with mocked cache "retrieve" function
      const model = new ExtendedModel({ ProviderModel: providerMock.Model, koop: koopMock }, {
        cache: {
          retrieve: retrieveSpy
        }
      })

      model.pull({ url: 'domain/test-provider', params: {}, query: {} }, pullSpy)

      retrieveSpy.should.be.calledOnce()
      retrieveSpy.firstCall.args.length.should.equal(3)
      retrieveSpy.firstCall.args[0].should.equal('test-provider::data')
      retrieveSpy.firstCall.args[1].should.be.an.Object().and.be.empty()
      retrieveSpy.firstCall.args[2].should.be.an.Function()
      pullSpy.should.be.calledOnce()
      pullSpy.firstCall.args.length.should.equal(2)
      should.not.exist(pullSpy.firstCall.args[0])
      pullSpy.firstCall.args[1].should.be.an.Object().and.be.empty()
    })

    it('should create cache-key as provider name and concenated url params', () => {
      const retrieveSpy = sinon.spy(function (key, queryParams, callback) {
        callback(null, {})
      })
      const pullSpy = sinon.spy()

      // create a model with mocked cache "retrieve" function
      const model = new ExtendedModel({ ProviderModel: providerMock.Model, koop: koopMock }, {
        cache: {
          retrieve: retrieveSpy
        }
      })
      model.pull({ url: 'domain/test-provider', params: { host: 'host-param', id: 'id-param', layer: 'layer-param' }, query: {} }, pullSpy)

      retrieveSpy.should.be.calledOnce()
      retrieveSpy.firstCall.args.length.should.equal(3)
      retrieveSpy.firstCall.args[0].should.equal('test-provider::host-param::id-param::layer-param::data')
      retrieveSpy.firstCall.args[1].should.be.an.Object().and.be.empty()
      retrieveSpy.firstCall.args[2].should.be.an.Function()
      pullSpy.should.be.calledOnce()
      pullSpy.firstCall.args.length.should.equal(2)
      should.not.exist(pullSpy.firstCall.args[0])
      pullSpy.firstCall.args[1].should.be.an.Object().and.be.empty()
    })

    it('should create cache-key from Model defined createKey function', () => {
      const retrieveSpy = sinon.spy(function (key, queryParams, callback) {
        callback(null, {})
      })
      const pullSpy = sinon.spy()

      // create a model with mocked cache "retrieve" function
      const model = new ExtendedModel({ ProviderModel: providerMock.Model, koop: koopMock }, {
        cache: {
          retrieve: retrieveSpy
        }
      })
      model.createKey = function () { return 'custom-key' }
      model.pull({ url: 'domain/test-provider', query: {} }, pullSpy)
      retrieveSpy.should.be.calledOnce()
      retrieveSpy.firstCall.args.length.should.equal(3)
      retrieveSpy.firstCall.args[0].should.equal('custom-key::data')
      retrieveSpy.firstCall.args[1].should.be.an.Object().and.be.empty()
      retrieveSpy.firstCall.args[2].should.be.an.Function()
      pullSpy.should.be.calledOnce()
      pullSpy.firstCall.args.length.should.equal(2)
      should.not.exist(pullSpy.firstCall.args[0])
      pullSpy.firstCall.args[1].should.be.an.Object().and.be.empty()
    })
  })

  describe('transformation functions', function () {
    it('before function should modify request object', () => {
      let beforeReq
      const beforeSpy = sinon.spy(function (req, next) {
        // capture args because the req gets mutated
        beforeReq = _.cloneDeep(req)
        req.query.hello = 'world'
        next()
      })
      const getDataSpy = sinon.spy(function (req, callback) {
        callback(null, { metadata: {} })
      })

      const model = new ExtendedModel({ ProviderModel: providerMock.Model, koop: koopMock }, {
        cache: { retrieve: (key, query, callback) => { callback(new Error('no cache')) } }
      })
      model.before = beforeSpy
      model.getData = getDataSpy
      model.pull({ url: 'domain/test-provider', params: {}, query: {} }, function (err, data) {})
      beforeSpy.should.be.calledOnce()
      beforeSpy.firstCall.args.length.should.equal(2)
      beforeSpy.firstCall.args[0].should.be.an.Object()
      beforeReq.should.deepEqual({ url: 'domain/test-provider', params: {}, query: {} })
      beforeSpy.firstCall.args[1].should.be.a.Function()

      getDataSpy.should.be.calledOnce()
      getDataSpy.firstCall.args.length.should.equal(2)
      getDataSpy.firstCall.args[0].should.be.an.Object().and.deepEqual({ url: 'domain/test-provider', params: {}, query: { hello: 'world' } })
      getDataSpy.firstCall.args[1].should.be.a.Function()
    })

    it('after function should modify request and data object', () => {
      let getDataArgs
      let afterSpyArgs
      const getDataSpy = sinon.spy(function (req, callback) {
        // capture args because the req gets mutated
        getDataArgs = _.cloneDeep(arguments)
        callback(null, { metadata: {} })
      })
      const afterSpy = sinon.spy(function (req, data, callback) {
        // capture args because the req and data get mutated
        afterSpyArgs = _.cloneDeep(arguments)
        req.query.hello = 'world'
        data.metadata.food = 'bar'
        callback(null, data)
      })
      const pullCallbackSpy = sinon.spy(function (err, data) {})
      const model = new ExtendedModel({ ProviderModel: providerMock.Model, koop: koopMock }, {
        cache: { retrieve: (key, query, callback) => { callback(new Error('no cache')) } }
      })
      model.getData = getDataSpy
      model.after = afterSpy
      model.pull({ url: 'domain/test-provider', params: {}, query: {} }, pullCallbackSpy)

      getDataSpy.should.be.calledOnce()
      getDataSpy.firstCall.args.length.should.equal(2)
      getDataArgs[0].should.deepEqual({ url: 'domain/test-provider', params: {}, query: {} })
      getDataSpy.firstCall.args[1].should.be.an.Function()

      afterSpy.should.be.calledOnce()
      afterSpy.firstCall.args.length.should.equal(3)
      afterSpy.firstCall.args[0].should.be.an.Object()
      afterSpyArgs[0].should.deepEqual({ url: 'domain/test-provider', params: {}, query: { } })
      afterSpy.firstCall.args[0].should.deepEqual({ url: 'domain/test-provider', params: {}, query: { hello: 'world' } }) // captures the expected change to the req argument in the after function
      afterSpyArgs[1].should.deepEqual({ metadata: {} })
      afterSpy.firstCall.args[2].should.be.an.Function()

      pullCallbackSpy.should.be.calledOnce()
      pullCallbackSpy.firstCall.args.length.should.equal(2)
      should.not.exist(pullCallbackSpy.firstCall.args[0])
      pullCallbackSpy.firstCall.args[1].should.be.an.Object().and.deepEqual({ metadata: { food: 'bar' } })
    })
  })

  describe('fetch layer metadata', function () {
    afterEach(function () {
      // reset the getLayer() function to default
      ExtendedModel.prototype.getLayer = undefined
    })

    it('should throw an error if the getLayer() function is not implemented', function () {
      const retrieveSpy = sinon.spy(function (key, queryParams, callback) {
        callback(new Error('not found'))
      })
      const callbackSpy = sinon.spy()

      // create a model with mocked cache "retrieve" function
      const model = new ExtendedModel({ ProviderModel: providerMock.Model, koop: koopMock }, {
        cache: {
          retrieve: retrieveSpy
        }
      })

      model.pullLayer({ url: 'domain/test-provider', params: {}, query: {} }, callbackSpy)

      retrieveSpy.should.be.calledOnce()
      callbackSpy.should.be.calledOnce()
      callbackSpy.firstCall.args.length.should.equal(1)
      callbackSpy.firstCall.args[0].should.be.an.Error()
    })

    it('should try to fetch from cache', function () {
      const retrieveSpy = sinon.spy(function (key, queryParams, callback) {
        callback(null, {})
      })
      const getLayerSpy = sinon.spy(function (req, callback) {
        callback(null, {})
      })
      const callbackSpy = sinon.spy()

      ExtendedModel.prototype.getLayer = getLayerSpy

      // create a model with mocked cache "retrieve" function
      const model = new ExtendedModel({ ProviderModel: providerMock.Model, koop: koopMock }, {
        cache: {
          retrieve: retrieveSpy
        }
      })

      model.pullLayer({ url: 'domain/test-provider', params: {}, query: {} }, callbackSpy)

      retrieveSpy.should.be.calledOnce()
      retrieveSpy.firstCall.args.length.should.equal(3)
      retrieveSpy.firstCall.args[0].should.equal('test-provider::layer')
      retrieveSpy.firstCall.args[1].should.be.an.Object().and.be.empty()
      retrieveSpy.firstCall.args[2].should.be.an.Function()
      getLayerSpy.should.not.be.called()
      callbackSpy.should.be.calledOnce()
      callbackSpy.firstCall.args.length.should.equal(2)
      should.not.exist(callbackSpy.firstCall.args[0])
      callbackSpy.firstCall.args[1].should.be.an.Object()
    })

    it('should call the getLayer() function if cache misses', function () {
      const retrieveSpy = sinon.spy(function (key, queryParams, callback) {
        callback(new Error('not found'))
      })
      const getLayerSpy = sinon.spy(function (req, callback) {
        callback(null, {})
      })
      const callbackSpy = sinon.spy()

      // create a model with mocked cache "retrieve" function
      const model = new ExtendedModel({ ProviderModel: providerMock.Model, koop: koopMock }, {
        cache: {
          retrieve: retrieveSpy
        }
      })

      model.getLayer = getLayerSpy

      model.pullLayer({ url: 'domain/test-provider', params: {}, query: {} }, callbackSpy)

      retrieveSpy.should.be.calledOnce()
      getLayerSpy.should.be.calledOnce()
      callbackSpy.should.be.calledOnce()
      callbackSpy.firstCall.args.length.should.equal(2)
      should.not.exist(callbackSpy.firstCall.args[0])
      callbackSpy.firstCall.args[1].should.be.an.Object()
    })
  })

  describe('fetch catalog metadata', function () {
    afterEach(function () {
      // reset the getCatalog() function to default
      ExtendedModel.prototype.getCatalog = undefined
    })

    it('should throw an error if the getCatalog() function is not implemented', function () {
      const retrieveSpy = sinon.spy(function (key, queryParams, callback) {
        callback(new Error('not found'))
      })
      const callbackSpy = sinon.spy()

      // create a model with mocked cache "retrieve" function
      const model = new ExtendedModel({ ProviderModel: providerMock.Model, koop: koopMock }, {
        cache: {
          retrieve: retrieveSpy
        }
      })

      model.pullCatalog({ url: 'domain/test-provider', params: {}, query: {} }, callbackSpy)

      retrieveSpy.should.be.calledOnce()
      callbackSpy.should.be.calledOnce()
      callbackSpy.firstCall.args.length.should.equal(1)
      callbackSpy.firstCall.args[0].should.be.an.Error()
    })

    it('should try to fetch from cache', function () {
      const retrieveSpy = sinon.spy(function (key, queryParams, callback) {
        callback(null, {})
      })
      const getCatalogSpy = sinon.spy(function (req, callback) {
        callback(null, {})
      })
      const callbackSpy = sinon.spy()

      // create a model with mocked cache "retrieve" function
      const model = new ExtendedModel({ ProviderModel: providerMock.Model, koop: koopMock }, {
        cache: {
          retrieve: retrieveSpy
        }
      })

      model.getCatalog = getCatalogSpy

      model.pullCatalog({ url: 'domain/test-provider', params: {}, query: {} }, callbackSpy)

      retrieveSpy.should.be.calledOnce()
      retrieveSpy.firstCall.args.length.should.equal(3)
      retrieveSpy.firstCall.args[0].should.equal('test-provider::catalog')
      retrieveSpy.firstCall.args[1].should.be.an.Object().and.be.empty()
      retrieveSpy.firstCall.args[2].should.be.an.Function()
      getCatalogSpy.should.not.be.called()
      callbackSpy.should.be.calledOnce()
      callbackSpy.firstCall.args.length.should.equal(2)
      should.not.exist(callbackSpy.firstCall.args[0])
      callbackSpy.firstCall.args[1].should.be.an.Object()
    })

    it('should call the getCatalog() function is cache misses', function () {
      const retrieveSpy = sinon.spy(function (key, queryParams, callback) {
        callback(new Error('not found'))
      })
      const getCatalogSpy = sinon.spy(function (req, callback) {
        callback(null, {})
      })
      const callbackSpy = sinon.spy()

      // create a model with mocked cache "retrieve" function
      const model = new ExtendedModel({ ProviderModel: providerMock.Model, koop: koopMock }, {
        cache: {
          retrieve: retrieveSpy
        }
      })

      model.getCatalog = getCatalogSpy

      model.pullCatalog({ url: 'domain/test-provider', params: {}, query: {} }, callbackSpy)

      retrieveSpy.should.be.calledOnce()
      getCatalogSpy.should.be.calledOnce()
      callbackSpy.should.be.calledOnce()
      callbackSpy.firstCall.args.length.should.equal(2)
      should.not.exist(callbackSpy.firstCall.args[0])
      callbackSpy.firstCall.args[1].should.be.an.Object()
    })
  })
})
