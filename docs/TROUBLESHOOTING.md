# Troubleshooting Guide — AppServicioshosteleria

## Common Issues & Solutions

### App won't load / blank screen

**Symptoms**: The app URL shows a blank page or loading spinner that never resolves.

**Diagnosis steps**:
1. Open browser DevTools → Console tab.
2. Check for errors mentioning `VITE_BASE44_APP_ID` or `VITE_BASE44_BACKEND_URL`.
3. Check the Network tab for failed requests.

**Solutions**:
- If environment variables are missing: Create `.env.local` with the correct values (see [DEPLOYMENT_SECURITY.md](DEPLOYMENT_SECURITY.md)).
- If requests return 401: Ensure `requiresAuth: true` in `src/api/base44Client.js` and that the user is logged in.
- If requests return 403: Check Base44 entity access rules in the dashboard.

---

### Authentication fails / redirect loop

**Symptoms**: User is repeatedly redirected to login page even after logging in.

**Solutions**:
- Clear browser localStorage and cookies, then log in again.
- Verify the Base44 app ID matches the environment (dev vs. production).
- Check that the session token hasn't expired; Base44 SDK should auto-refresh.

---

### WhatsApp messages not sending

**Symptoms**: `enviarWhatsAppDirecto` or `enviarWhatsAppMasivo` functions return success but messages are not received.

**Diagnosis steps**:
1. Check the Cloud Function logs in Base44 dashboard.
2. Verify the WhatsApp API key is valid and not expired.
3. Check if the phone number format is correct (must include country code, e.g., `+34XXXXXXXXX`).

**Solutions**:
- Rotate the WhatsApp API key if expired (see [DEPLOYMENT_SECURITY.md](DEPLOYMENT_SECURITY.md) → Key Rotation).
- Verify the phone number format in the Camarero record.
- Check WhatsApp API rate limits; slow down bulk sends if hitting limits.

---

### Google Sheets export fails

**Symptoms**: `exportarAsistenciaSheets` returns an error.

**Solutions**:
- Verify the Google Sheets API credentials are valid.
- Check that the target spreadsheet exists and the service account has write access.
- Review Cloud Function logs for the specific API error.

---

### Kanban board not updating after assignment

**Symptoms**: After dragging a camarero card, the board doesn't reflect the new assignment.

**Solutions**:
- This usually indicates a failed mutation. Check the browser console for error messages.
- Verify the `onSuccess` handler calls `queryClient.invalidateQueries({ queryKey: ['asignaciones'] })`.
- If the mutation succeeded but UI didn't update, try manually refreshing — if the data is correct, there may be a stale query key mismatch.

---

### Background services not running

**Symptoms**: Automatic reminders or notifications are not being sent.

**Solutions**:
- Ensure `useBackgroundServices` is mounted in `Layout.jsx` (it should be on every authenticated page).
- Check the browser console for polling errors.
- Verify the Cloud Functions (`procesarEnviosProgramados`, `notificarAsignacionesProximas`) are deployed and not failing.

---

### "Turno" times not saving correctly

**Symptoms**: Shift times appear shifted by hours after saving.

**Solutions**:
- This is almost always a timezone issue. Ensure all dates use `parseISO()` from `date-fns`, never `new Date(string)`.
- Do not use `toLocaleDateString()` or `toISOString()` — use `format()` from `date-fns` with explicit format strings.

---

## Performance Debugging

### Slow initial load

1. Run `npm run build && npm run preview` locally.
2. Open DevTools → Performance tab → record page load.
3. Check for large JavaScript bundles (Network tab → JS files sorted by size).
4. Ensure Vite tree-shaking is working: avoid wildcard imports (`import * as X`).

### Slow React Query fetches

1. Open React Query DevTools (if installed) to inspect query states and timing.
2. Verify `staleTime` is set appropriately — frequently-changing data should have a shorter stale time.
3. Check if unnecessary `queryClient.invalidateQueries()` calls are triggering redundant fetches.

### High memory usage

1. Check for event listener leaks: ensure `useEffect` cleanup functions remove all listeners and clear all intervals/timeouts.
2. Background polling intervals in `useBackgroundServices` must be cleared in the cleanup function.
3. Use Chrome DevTools → Memory → Heap Snapshot to identify retained objects.

---

## Database Query Optimization

- Always filter on the server (Base44 filter params), not client-side.
- Use `fecha_pedido` on `AsignacionCamarero` for date-range queries — avoid joining `Pedidos` for date filtering.
- Avoid unbounded list queries; always provide a date range or record limit.
- If a page is slow, check how many API calls it makes on mount (React Query DevTools).

---

## Memory Leak Detection

Common causes in this codebase:

1. **Interval not cleared**: Every `setInterval` in a `useEffect` must have a corresponding `clearInterval` in the cleanup.
2. **Subscription not unsubscribed**: Any event subscription must be removed in cleanup.
3. **State update on unmounted component**: Guard async operations with an `isMounted` flag or AbortController.

```js
useEffect(() => {
  let isMounted = true;
  fetchData().then(data => {
    if (isMounted) setData(data);
  });
  return () => { isMounted = false; };
}, []);
```

---

## Error Code Reference

| Error | Meaning | Solution |
|-------|---------|---------|
| `401 Unauthorized` | Missing or expired session token | Log in again; check `requiresAuth` |
| `403 Forbidden` | User role lacks permission | Check RBAC rules in Cloud Function |
| `404 Not Found` | Entity ID doesn't exist | Verify ID; check if record was deleted |
| `422 Unprocessable Entity` | Validation failed | Check input format; review Cloud Function logs |
| `429 Too Many Requests` | Rate limit hit | Reduce polling frequency; add delays in bulk sends |
| `500 Internal Server Error` | Cloud Function unhandled error | Check Cloud Function logs in Base44 dashboard |

---

## Contacting Support

- **Repository issues**: Open a GitHub issue at [joseluiscarrizo/AppServicioshosteleria](https://github.com/joseluiscarrizo/AppServicioshosteleria/issues).
- **Base44 platform issues**: Use the Base44 dashboard support channel.
- **Firebase Hosting issues**: https://firebase.google.com/support.

---

## Related Documents

- [ARCHITECTURE_ROBUST.md](ARCHITECTURE_ROBUST.md) — Architecture overview
- [CLOUD_FUNCTIONS_GUIDE.md](CLOUD_FUNCTIONS_GUIDE.md) — Cloud Functions debugging
- [DEPLOYMENT_SECURITY.md](DEPLOYMENT_SECURITY.md) — Deployment configuration
- [DEVELOPMENT_STANDARDS.md](DEVELOPMENT_STANDARDS.md) — Development conventions
