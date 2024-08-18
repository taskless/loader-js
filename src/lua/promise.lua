--[[
https://github.com/Billiam/promise.lua
extended by https://github.com/recih/promise.lua

Copyright © `2015` `Colin Fein`

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the “Software”), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
]]

-- Port of https://github.com/rhysbrettbowen/promise_impl/blob/master/promise.js
-- and https://github.com/rhysbrettbowen/Aplus
--
local pack = table.pack or _G.pack

local queue = {}

local State = {
  PENDING   = 'pending',
  FULFILLED = 'fulfilled',
  REJECTED  = 'rejected',
}

local passthrough = function(x) return x end
local errorthrough = function(x) error(x) end

local function callable_table(callback)
  local mt = getmetatable(callback)
  return type(mt) == 'table' and type(mt.__call) == 'function'
end

local function is_callable(value)
  local t = type(value)
  return t == 'function' or (t == 'table' and callable_table(value))
end

local transition, resolve, run

local Promise = {}
local prototype = {
  is_promise = true,
  state = State.PENDING
}
local mt = { __index = prototype }

local do_async = function(callback)
  if Promise.async then
    Promise.async(callback)
  else
    table.insert(queue, callback)
  end
end

local reject = function(promise, reason)
  transition(promise, State.REJECTED, reason)
end

local fulfill = function(promise, value)
  transition(promise, State.FULFILLED, value)
end

transition = function(promise, state, value)
  if promise.state == state
    or promise.state ~= State.PENDING
    or ( state ~= State.FULFILLED and state ~= State.REJECTED )
  then
    return
  end

  promise.state = state
  promise.value = value
  run(promise)
end

function prototype:next(on_fulfilled, on_rejected)
  local promise = Promise.new()

  table.insert(self.queue, {
    fulfill = is_callable(on_fulfilled) and on_fulfilled or nil,
    reject = is_callable(on_rejected) and on_rejected or nil,
    promise = promise
  })

  run(self)

  return promise
end

resolve = function(promise, x)
  if promise == x then
    reject(promise, 'TypeError: cannot resolve a promise with itself')
    return
  end
  
  local x_type = type(x)

  if x_type ~= 'table' then
    fulfill(promise, x)
    return
  end
  
  -- x is a promise in the current implementation
  if Promise.is_promise(x) then 
    -- 2.3.2.1 if x is pending, resolve or reject this promise after completion
    if x.state == State.PENDING then
      x:next(
        function(value)
          resolve(promise, value)
        end,
        function(reason)
          reject(promise, reason)
        end
      )
      return
    end
    -- if x is not pending, transition promise to x's state and value
    transition(promise, x.state, x.value)
    return
  end

  local called = false
  -- 2.3.3.1. Catches errors thrown by __index metatable
  local success, reason = pcall(function()
    local next = x.next
    if is_callable(next) then
      next(
        x,
        function(y) 
          if not called then
            resolve(promise, y)
            called = true
          end
        end,
        function(r)
          if not called then
            reject(promise, r)
            called = true
          end
        end
      )
    else
      fulfill(promise, x)
    end
  end)

  if not success then
    if not called then
      reject(promise, reason)
    end
  end
end

run = function(promise)
  if promise.state == State.PENDING then return end

  do_async(function()
    -- drain promise.queue while allowing pushes from within callbacks
    local q = promise.queue
    local i = 0
    while i < #q do
      i = i + 1
      local obj = q[i]
      local success, result = pcall(function()
        local success = obj.fulfill or passthrough
        local failure = obj.reject or errorthrough
        local callback = promise.state == State.FULFILLED and success or failure
        return callback(promise.value)
      end)

      if not success then
        reject(obj.promise, result)
      else
        resolve(obj.promise, result)
      end
    end
    for j = 1, i do
      q[j] = nil
    end
  end)
end

function prototype:catch(callback)
  return self:next(nil, callback)
end

function prototype:resolve(value)
  fulfill(self, value)
end

function prototype:reject(reason)
  reject(self, reason)
end

function Promise.new(callback)
  local instance = {
    queue = {}
  }
  setmetatable(instance, mt)

  if callback then
    callback(
      function(value)
        resolve(instance, value)
      end,
      function(reason)
        reject(instance, reason)
      end
    )
  end

  return instance
end

function Promise.is_promise(value)
  if type(value) ~= "table" then return end

  return value.is_promise
end

function Promise.resolve(value)
  return Promise.new(function(resolve, reject)
    resove(value)
  end)
end

function Promise.reject(reason)
  return Promise.new(function(resolve, reject)
    reject(reason)
  end)
end

function Promise.update()
  while true do
    local async = table.remove(queue, 1)

    if not async then
      break
    end

    async()
  end
end

local function get_promises(...)
  local args = pack(...)
  if args.n == 1 and type(args[1]) == "table" and not Promise.is_promise(args[1]) then
    return args[1]
  end
  return args
end

-- resolve when all promises complete
-- see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all
function Promise.all(...)
  local promises = get_promises(...)
  local results = {}
  local state = State.FULFILLED
  local n = promises.n or #promises
  local remaining = n

  local promise = Promise.new()

  local check_finished = function()
    if remaining > 0 then
      return
    end
    transition(promise, state, results)
  end

  for i = 1, n do
    local p = promises[i]
    if Promise.is_promise(p) then
      p:next(
        function(value)
          results[i] = value
          remaining = remaining - 1
          check_finished()
        end,
        function(reason)
          reject(promise, reason)
        end
      )
    else
      results[i] = p
      remaining = remaining - 1
    end
  end

  check_finished()

  return promise
end

-- resolves after all of the given promises have either fulfilled or rejected, 
-- with an array of objects that each describes the outcome of each promise.
-- see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
function Promise.all_settled(...)
  local promises = get_promises(...)
  local results = {}
  local n = promises.n or #promises
  local remaining = n

  local promise = Promise.new()
  if remaining <= 0 then
    fulfill(promise, results)
    return promise
  end

  local check_finished = function()
    if remaining > 0 then
      return
    end
    fulfill(promise, results)
  end

  for i = 1, n do
    local p = promises[i]
    if Promise.is_promise(p) then
      p:next(
        function(value)
          results[i] = { status = State.FULFILLED, value = value }
          remaining = remaining - 1
          check_finished()
        end,
        function(reason)
          results[i] = { status = State.REJECTED, reason = reason }
          remaining = remaining - 1
          check_finished()
        end
      )
    else
      results[i] = { status = State.FULFILLED, value = p }
      remaining = remaining - 1
    end
  end

  check_finished()

  return promise
end

-- resolve when any promises complete, reject when all promises are rejected
-- see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/any
function Promise.any(...)
  local promises = get_promises(...)
  local state = State.FULFILLED
  local n = promises.n or #promises
  local remaining = n

  local promise = Promise.new()

  for i = 1, n do
    local p = promises[i]
    if Promise.is_promise(p) then
      p:next(
        function(value)
          fulfill(promise, value)
        end,
        function(reason)
          remaining = remaining - 1

          if remaining <= 0 then
            reject(promise, "AggregateError: All promises were rejected")
          end
        end
      )
    else
      -- resolve immediately if a non-promise provided
      fulfill(promise, p)
      break
    end
  end

  return promise
end

-- returns a promise that fulfills or rejects as soon as one of the promises in an iterable fulfills or rejects, 
-- with the value or reason from that promise
-- see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/race
function Promise.race(...)
  local promises = get_promises(...)
  local promise = Promise.new()
  local n = promises.n or #promises

  local success = function(value)
    promise:resolve(value)
  end

  local fail = function(reason)
    promise:reject(reason)
  end

  for i = 1, n do
    local p = promises[i]
    if Promise.is_promise(p) then
      p:next(success, fail)
    else
      -- resolve immediately if a non-promise provided
      promise:resolve(p)
      break
    end
  end

  return promise
end

return Promise
