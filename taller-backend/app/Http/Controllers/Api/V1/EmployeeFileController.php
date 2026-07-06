<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\EmployeeFile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class EmployeeFileController extends Controller
{
    public function index(Employee $employee)
    {
        return response()->json($employee->files);
    }

    public function store(Request $request, Employee $employee)
    {
        $request->validate([
            'file'        => 'required|file|max:10240|mimes:jpg,jpeg,png,gif,webp,pdf,doc,docx,xls,xlsx,txt,csv',
            'description' => 'nullable|string|max:255',
        ]);

        $file        = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $extension   = $file->getClientOriginalExtension();
        $storedName  = Str::uuid() . '.' . $extension;
        $path        = $file->storeAs("employee-files/{$employee->id}", $storedName, 'public');

        $record = $employee->files()->create([
            'original_name' => $originalName,
            'stored_name'   => $storedName,
            'path'          => $path,
            'mime_type'     => $file->getMimeType(),
            'size'          => $file->getSize(),
            'description'   => $request->description,
        ]);

        return response()->json($record, 201);
    }

    public function download(Employee $employee, EmployeeFile $file)
    {
        abort_unless($file->employee_id === $employee->id, 404);

        return Storage::disk('public')->download($file->path, $file->original_name);
    }

    public function destroy(Employee $employee, EmployeeFile $file)
    {
        abort_unless($file->employee_id === $employee->id, 404);

        Storage::disk('public')->delete($file->path);
        $file->delete();

        return response()->json(['message' => 'Archivo eliminado']);
    }
}
